const compression = require('compression');
const config = require('config');
const cookieParser = require('cookie-parser');
const ect = require('ect');
const express = require('express');
const ip = require('request-ip');

const geoip = require('../geoip');
const users = require('../users');
const wunderlist = require('../wunderlist');


const port = config.get('website.port');


const getUserData = req => Promise.all([
    users.getByToken(req),
    geoip.getInfo(ip.getClientIp(req))
]).then(result => ({
    user: result[0],
    timezone: result[1].time_zone === '' ? 'UTC' : result[1].time_zone
}));


express()
    .use(compression())
    .use(cookieParser())

    .use('/', express.static('static'))
    .use('/moment.js', express.static('node_modules/moment/min/moment.min.js'))
    .use('/moment-timezone.js', express.static('node_modules/moment-timezone/builds/moment-timezone-with-data-2012-2022.min.js'))
    .use('/fonts', express.static('node_modules/lato-font/fonts'))
    .use('/fonts/lato.css', express.static('node_modules/lato-font/css/lato-font.min.css'))

    .get('/', (req, res) => getUserData(req)
        .then(data => res.render('user', data))
        .catch(err => res.render('index')))

    .get('/tasks.json', (req, res) => getUserData(req)
        .then(data => users.getCompletedTasks(data.user, data.timezone).then(tasks => {
            data.tasks = tasks;
            res.json(data);
        })))

    .get('/login', (req, res) => res.redirect(wunderlist.getOAuthUrl()))

    .get('/login/result', (req, res) => wunderlist.getOAuthUser(req.query.state, req.query.code)
        .then(users.create)
        .then(user => users.setToken(user, res).redirect('/'))
        .catch(err => res.render('index')))

    .set('view engine', 'ect')
    .engine('ect', ect({
        watch: true,
        root: __dirname + '/../../views'
    }).render)
    .listen(port, () => console.info('Website started at port ' + port));