const config = require('config');
const r = require('rethinkdb');
const Promise = require('bluebird');


const getDatabases = c => r
    .dbList()
    .run(c);

const createDatabase = (c, db) => r
    .dbCreate(db)
    .run(c)
    .then(() => r.db(db)
        .wait()
        .run(c));

const checkDatabase = (c, db) => getDatabases(c).then(names => {
    if (names.indexOf(db) === -1) {
        return createDatabase(c, db);
    }
});

const getTables = c => r
    .tableList()
    .run(c);

const createTable = (c, table) => r
    .tableCreate(table)
    .run(c)
    .then(() => r.table(table)
        .wait()
        .run(c));

const checkTables = (c, tablesAndIndexes) => Promise.all(getTables(c).then(names => {
    return Object.keys(tablesAndIndexes)
        .filter(table => names.indexOf(table) === -1)
        .map(table => createTable(c, table));
}));

const getIndexes = (c, table) => r.table(table)
    .indexList()
    .run(c);

const createIndex = (c, table, index) => r.table(table)
    .indexCreate(index.name, index.predicate, index.options)
    .run(c)
    .then(() => r.table(table)
        .indexWait(index.name)
        .run(c));

const checkIndexes = (c, tablesAndIndexes) => Promise.all(Object.keys(tablesAndIndexes)
    .map(table => Promise.all(getIndexes(c, table).then(names => {
        return tablesAndIndexes[table]
            .filter(index => names.indexOf(index.name) === -1)
            .map(index => createIndex(c, table, index));
    }))));

const connect = () => r.connect({
    host: config.get('rethinkdb.host'),
    port: config.get('rethinkdb.port')
});

const getConnection = tablesAndIndexes => connect().then(c => {
    const db = config.get('rethinkdb.db');

    return checkDatabase(c, db)
        .then(() => c.use(db))
        .then(() => checkTables(c, tablesAndIndexes))
        .then(() => checkIndexes(c, tablesAndIndexes))
        .then(() => c);
});


module.exports = {
    getConnection
};