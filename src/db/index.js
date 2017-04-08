const r = require('rethinkdb');
const Promise = require('bluebird');

const setup = require('./setup');
const result = require('./result');


const connection = setup.getConnection({
    users: [{
        name: 'cookieToken',
        predicate: r.row('cookieToken')
    }],
    lists: [{
        name: 'userId',
        predicate: r.row('owner_id')
    }],
    tasks: [{
        name: 'listId',
        predicate: r.row('list_id')
    }, {
        name: 'completedAt',
        predicate: []
            .concat(r.args(r.branch(r.row('completed'), [ r.ISO8601(r.row('completed_at')) ], [])))
            .concat(r.args(r.row('subtasks').filter({ completed: true }).map(function(row) { return r.ISO8601(row('completed_at')); }))),
        options: { multi: true }
    }]
});

const upsert = (table, entities) => connection.then(c => r.table(table)
    .insert(entities, { conflict: 'update' })
    .run(c)
    .then(result.check));

const getAll = (table, value, index) => connection.then(c => r.table(table)
    .getAll(value, { index })
    .run(c)
    .then(result.toArray));

const upsertUser = user => upsert('users', user);

const getUserByCookieToken = cookieToken => connection.then(c => r.table('users')
    .getAll(cookieToken, { index: 'cookieToken' })
    .run(c)
    .then(result.toUnit));

const feedUsers = () => connection.then(c => r.table('users')
    .changes({ includeInitial: true, includeTypes: true })
    .run(c));

const upsertLists = lists => upsert('lists', lists);

const getLists = userId => getAll('lists', userId, 'userId');

const upsertTasks = tasks => upsert('tasks', tasks);

const getTasks = listId => getAll('tasks', listId, 'listId');

const getCompletedTasks = (listIds, earlyDate, lateDate) => connection.then(c => r.table('tasks')
    .between(earlyDate, lateDate, { index: 'completedAt' })
    .distinct()
    .filter(function(row) { return r.expr(listIds).contains(row('list_id')); })
    .eqJoin('list_id', r.table('lists'))
    .map(r.object('task', r.row('left'), 'list', r.row('right')))
    .orderBy(r.row('list')('title'), r.row('task')('title'))
    .run(c)
    .then(result.toArray));


module.exports = {
    upsertUser,
    getUserByCookieToken,
    feedUsers,
    upsertLists,
    getLists,
    upsertTasks,
    getTasks,
    getCompletedTasks
};