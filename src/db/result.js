const Promise = require('bluebird');


const check = result => new Promise((resolve, reject) => {
    if (result.errors === 0) {
        resolve();
    }
    else {
        reject();
    }
});

const toArray = cursor => cursor.toArray();

const toUnit = cursor => cursor.toArray().then(array => array.length !== 1
    ? Promise.reject('There must be one and only one result')
    : Promise.resolve(array[0]));


module.exports = {
    check,
    toArray,
    toUnit
};