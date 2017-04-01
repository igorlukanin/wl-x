const config = require('config');
const moment = require('moment');
const Promise = require('bluebird');
const uuid = require('uuid/v4');

const db = require('./db');


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


module.exports = {
    create,
    setToken,
    getByToken
};