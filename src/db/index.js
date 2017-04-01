const r = require('rethinkdb');
const Promise = require('bluebird');

const setup = require('./setup');


const connection = setup.getConnection({});


module.exports = {};