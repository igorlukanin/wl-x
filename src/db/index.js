const r = require('rethinkdb');
const Promise = require('bluebird');

const setup = require('./setup');
const result = require('./result');


const connection = setup.getConnection({
    users: [{
        name: 'cookieToken',
        predicate: r.row('cookieToken')
    }]
});

const upsertUser = user => connection.then(c => r.table('users')
    .insert(user, { conflict: 'update' })
    .run(c)
    .then(result.check));

const getUserByCookieToken = cookieToken => connection.then(c => r.table('users')
    .getAll(cookieToken, { index: 'cookieToken' })
    .run(c)
    .then(result.toUnit));


module.exports = {
    upsertUser,
    getUserByCookieToken
};