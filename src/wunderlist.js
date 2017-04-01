const config = require('config');
const Promise = require('bluebird');
const request = require('request');
const uuid = require('uuid/v4');


const clientId = config.get('wunderlist.clientId');
const clientSecret = config.get('wunderlist.clientSecret');
const redirectUri = config.get('wunderlist.redirectUri');

const states = [];


const getOAuthUrl = () => {
    const state = uuid();
    states.push(state);

    return 'https://www.wunderlist.com/oauth/authorize' +
        '?client_id=' + clientId +
        '&redirect_uri=' + encodeURI(redirectUri) +
        '&state=' + state;
};

const getOAuthAccessToken = (state, code) => new Promise((resolve, reject) => {
    if (states.indexOf(state) === -1) {
        reject('Unknown state');
        return;
    }

    request({
        url: 'https://www.wunderlist.com/oauth/access_token',
        method: 'POST',
        json: {
            client_id: clientId,
            client_secret: clientSecret,
            code
        }
    }, (err, res) => {
        if (err) {
            reject('Failed to get access token');
            return;
        }

        resolve(res.body.access_token);
    });
});

const getApiEndpointUri = endpoint => 'https://a.wunderlist.com/api/v1/' + endpoint;

const requestApi = (accessToken, endpoint, method = 'GET', params = {}) => new Promise((resolve, reject) => request({
    url: getApiEndpointUri(endpoint),
    method,
    json: params,
    headers: {
        'X-Client-ID': clientId,
        'X-Access-Token': accessToken
    }
}, (err, res) => {
    if (err) {
        reject('Failed to call API');
        return;
    }

    resolve(res.body);
}));

const getOAuthUser = (state, code) => getOAuthAccessToken(state, code)
    .then(accessToken => requestApi(accessToken, 'user').then(user => {
        user.accessToken = accessToken;
        return user;
    }));


module.exports = {
    getOAuthUrl,
    getOAuthUser
};