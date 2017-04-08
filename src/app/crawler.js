const config = require('config');
const Promise = require('bluebird');

const db = require('../db');
const users = require('../users');


let cursor = undefined;

const processUserFeed = () => {
    console.info('Crawler started');

    if (cursor !== undefined) {
        cursor.close();
    }

    db.feedUsers().then(newCursor => {
        cursor = newCursor;
        cursor.each((err, entry) => {
            const user = entry.new_val;

            if (user !== undefined) {
                console.info('Crawler: ' + entry.type + ' / ' + user.id);
                users.update(user);
            }
        });
    });
};

processUserFeed();
setInterval(processUserFeed, config.get('crawler.restartTimeoutMinutes') * 60 * 1000);