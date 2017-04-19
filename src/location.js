const config = require('config');
const lru = require('lru-cache');
const moment = require('moment-timezone');
const Promise = require('bluebird');
const request = require('request');


const cache = lru({ maxAge: config.get('location.cacheTimeoutDays') * 24 * 3600 * 1000 });


const getNonLocalhostIp = ip => {
    console.log(ip);
    console.log(ip === '::1');
    console.log(config.get('location.ipAtLocalhost'));

    return ip === '::1'
        ? config.get('location.ipAtLocalhost')
        : ip;
};

const requestFreeGeoIpApi = ip => new Promise((resolve, reject) => request({
    url: `http://freegeoip.net/json/${ip}`,
    method: 'GET',
    json: true
}, (err, res) => {
    console.log('API call');

    if (err) {
        reject('Failed to call API');
        return;
    }

    resolve(res.body);
}));

const requestSunriseSunsetApi = (latitude, longitude) => new Promise((resolve, reject) => request({
    url: `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}`,
    method: 'GET',
    json: true
}, (err, res) => {
    console.log('API call');

    if (err) {
        reject('Failed to call API');
        return;
    }

    resolve(res.body);
}));

const getPeriod = (timezone, times) => {
    const now = moment.tz(timezone);
    const sunrise = moment.tz(times.sunrise, 'HH:mm:ss A', 'UTC');
    const sunset = moment.tz(times.sunset, 'HH:mm:ss A', 'UTC');
console.log(now.unix());
console.log(sunrise.unix());
console.log(sunset.unix());
    return now.isBetween(sunrise, sunset) ? 'day' : 'night';
};

/*
geoip: {
  ip: '128.75.91.175',
  country_code: 'RU',
  country_name: 'Russia',
  region_code: 'SVE',
  region_name: 'Sverdlovskaya Oblast\'',
  city: 'Yekaterinburg',
  zip_code: '620000',
  time_zone: 'Asia/Yekaterinburg',
  latitude: 56.8575,
  longitude: 60.6125,
  metro_code: 0 }

sunrise: {
  results: {
    sunrise: '12:40:06 AM',
    sunset: '3:13:26 PM',
    solar_noon: '7:56:46 AM',
    day_length: '14:33:20',
    civil_twilight_begin: '11:57:56 PM',
    civil_twilight_end: '3:55:36 PM',
    nautical_twilight_begin: '11:02:48 PM',
    nautical_twilight_end: '4:50:45 PM',
    astronomical_twilight_begin: '9:51:46 PM',
    astronomical_twilight_end: '6:01:46 PM' },
  status: 'OK' }
*/

const loadInfo = ip => requestFreeGeoIpApi(getNonLocalhostIp(ip))
    .then(geoip => requestSunriseSunsetApi(geoip.latitude, geoip.longitude)
        .then(sunrise => ({
            timezone: geoip.time_zone,
            period: getPeriod(geoip.time_zone, sunrise.results)
        })));

const getInfo = ip => {
    const value = cache.get(ip);

    console.log(value);

    if (value !== undefined) {
        return Promise.resolve(value);
    }

    return loadInfo(ip).then(info => {
        cache.set(ip, info);
        return info;
    });
};


module.exports = {
    getInfo
};