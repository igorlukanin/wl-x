const config = require('config');
const Promise = require('bluebird');

const db = require('../db');
const users = require('../users');


const checkRoots = () => db.feedUsers(entry => {
    const user = entry.new_val;

    if (user !== undefined) {
        console.info(entry.type + ' / ' + user.id);

        Promise.resolve(user)
            .then(users.updateRoot)
            .then(users.updateLists)
            .catch(user => {
                // User data is unchanged, so do nothing
            });
    }
});

checkRoots();