const config = require('config');
const _ = require('lodash');
const moment = require('moment');
const Promise = require('bluebird');
const uuid = require('uuid/v4');

const db = require('./db');
const wunderlist = require('./wunderlist');


const cookieName = config.get('website.authCookie.name');
const cookieLifetimeDays = config.get('website.authCookie.expireDays');


const create = user => {
    user.cookieToken = uuid();

    return db.upsertUser(user).then(result => user);
};

const updateRoot = user => wunderlist.getRoot(user.accessToken).then(root => {
    if (user.root !== undefined && user.root.revision === root.revision) {
        return Promise.reject(user);
    }
    else {
        user.root = root;
        return db.upsertUser(user).then(result => user);
    }
});

const intersect = (inDatabase, inWunderlist) => {
    const inDatabaseDeleted = inDatabase.filter(x => x.deleted !== undefined && x.deleted);
    const inDatabaseNotDeleted = _.difference(inDatabase, inDatabaseDeleted);

    const unchanged = _.intersectionWith(inWunderlist, inDatabaseNotDeleted, _.isEqual);
    const changed = _.differenceWith(inWunderlist, unchanged, _.isEqual);
    const justDeleted = _.differenceBy(inDatabaseNotDeleted, unchanged, changed, x => x.id).map(x => {
        x.deleted = true;
        return x;
    });

    return {
        alreadyDeleted: inDatabaseDeleted,
        unchanged,
        changed,
        justDeleted
    };
};

const updateLists = user => Promise.all([
    db.getLists(user.id),
    wunderlist.getLists(user.accessToken)
]).then(result => {
    const sets = intersect(result[0], result[1]);

    return Promise.all([
        db.upsertLists(sets.changed.concat(sets.justDeleted)),
        Promise.map(sets.changed, list => updateTasks(user, list))
    ]);
});

const updateTasks = (user, list) => Promise.all([
    db.getTasks(list.id),
    wunderlist.getTasks(user.accessToken, list.id),
    wunderlist.getCompletedTasks(user.accessToken, list.id)
]).then(result => {
    const sets = intersect(result[0], result[1].concat(result[2]));
    const tasks = sets.changed.concat(sets.justDeleted);

    return Promise.map(tasks, task => updateTask(user, task))
        .then(db.upsertTasks);
});

const updateTask = (user, task) => wunderlist.getSubtasks(user.accessToken, task.id).then(subtasks => {
    task.subtasks = subtasks;
    return task;
});

const setToken = (user, res) => {
    res.cookie(cookieName, user.cookieToken, {
        expires: moment().add(cookieLifetimeDays, 'days').toDate(),
        httpOnly: true,
        secure: false // TODO: Use HTTPS and change
    });

    return res;
};

const getByToken = req => new Promise((resolve, reject) => {
    const token = req.cookies[cookieName];

    if (token === undefined) {
        reject('No cookie token');
        return;
    }

    db.getUserByCookieToken(token)
        .then(resolve)
        .catch(reject);
});

const isCompletedBetween = (entry, date1, date2) =>
    entry.completed && moment(entry.completed_at).isBetween(date1, date2);

const getCompletedTasks = (user, lateDate = new Date(), earlyDate) => {
    const lateMoment = moment(lateDate);

    const earlyMoment = earlyDate === undefined
        ? moment(lateMoment).subtract(1, 'day')
        : moment(earlyDate);

    return db.getLists(user.id).then(lists => {
        const ids = lists.map(list => list.id);
        return db.getCompletedTasks(ids, earlyMoment.toDate(), lateMoment.toDate());
    });
};


module.exports = {
    create,
    updateRoot,
    updateLists,
    setToken,
    getByToken,
    getCompletedTasks
};