const Promise = require('bluebird');


const check = result => new Promise((resolve, reject) => {
    if (result.errors === 0) {
        resolve();
    }
    else {
        reject();
    }
});

const toUnit = cursor => cursor
    .toArray()
    .then(array => new Promise((resolve, reject) => {
        if (array.length !== 1) {
            reject('There must be one and only one result');
            return;
        }

        resolve(array[0]);
    }));


module.exports = {
    check,
    toUnit
};