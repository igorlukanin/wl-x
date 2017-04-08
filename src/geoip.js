const config = require('config');
const lru = require('lru-cache');
const Promise = require('bluebird');
const request = require('request');


const cache = lru({ maxAge: config.get('geoip.cacheTimeoutDays') * 24 * 3600 * 1000 });
let requestCount = 0;


const logApiCall = (ip, err) => console.info(
    'FreeGeoIP API call # ' + (++requestCount) + ' (' + cache.length + ' IPs cached): ' +
    ip + (err ? ' — error' : '')
);

const requestApi = ip => new Promise((resolve, reject) => request({
    url: 'http://freegeoip.net/json/' + ip,
    method: 'GET',
    json: true
}, (err, res) => {
    logApiCall(ip, err);

    if (err) {
        reject('Failed to call API');
        return;
    }

    resolve(res.body);
}));

const getInfo = ip => {
    const value = cache.get(ip);

    return value === undefined
        ? requestApi(ip).then(data => {
            cache.set(ip, data);
            return data;
        })
        : Promise.resolve(value);
};


module.exports = {
    getInfo
};