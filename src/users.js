const config = require('config');
const moment = require('moment');
const Promise = require('bluebird');
const uuid = require('uuid/v4');

const db = require('./db');
const wunderlist = require('./wunderlist');


const cookieName = config.get('website.authCookie.name');
const cookieLifetimeDays = config.get('website.authCookie.expireDays');


const create = user => {
    user.cookieToken = uuid();

    return db.upsertUser(user)
        .then(result => user);
};

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

    return wunderlist.getLists(user.accessToken)
        .then(lists => Promise.all(lists.map(list => Promise.all([
            wunderlist.getTasks(user.accessToken, list.id),
            wunderlist.getCompletedTasks(user.accessToken, list.id)
        ]).then(result => ({
            list,
            tasks: result[0].concat(result[1]).filter(task => {
                return isCompletedBetween(task, earlyMoment, lateMoment)
                    || !task.completed;
            })
        })))))
        .then(lists => Promise.all(lists.map(list => Promise
            .all(list.tasks.map(task => wunderlist.getSubtasks(user.accessToken, task.id)
            .then(subtasks => ({ task, subtasks }))))
        .then(tasks => ({
            list: list.list,
            tasks: tasks.filter(task => task.task.completed
                || !task.task.completed && task.subtasks.some(subtask => isCompletedBetween(subtask, earlyMoment, lateMoment)))
        })))))
        .then(lists => lists.filter(list => list.tasks.length > 0));
};


module.exports = {
    create,
    setToken,
    getByToken,
    getCompletedTasks
};