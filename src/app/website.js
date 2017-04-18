const compression = require('compression');
const config = require('config');
const cookieParser = require('cookie-parser');
const ect = require('ect');
const express = require('express');
const ip = require('request-ip');

const db = require('../db');
const location = require('../location');
const users = require('../users');
const wunderlist = require('../wunderlist');


const port = config.get('website.port');


process.on('unhandledRejection', err => console.error(err));


const getUserData = req => Promise.all([
    users.getByToken(req),
    location.getInfo(ip.getClientIp(req))
]).then(([ user, location ]) => ({
    user,
    timezone: location.timezone,
    night: location.period === 'night'
}));


express()
    .use(compression())
    .use(cookieParser())

    .use('/', express.static('static'))
    .use('/moment.js', express.static('node_modules/moment/min/moment.min.js'))
    .use('/moment-timezone.js', express.static('node_modules/moment-timezone/builds/moment-timezone-with-data-2012-2022.min.js'))
    .use('/fonts', express.static('node_modules/lato-font/fonts'))
    .use('/fonts/lato.css', express.static('node_modules/lato-font/css/lato-font.min.css'))

    .get('/', (req, res) => res.render('index'))

    .get('/review', (req, res) => getUserData(req)
        .then(data => res.render('review', data))
        .catch(err => {
            console.error(err);
            res.redirect('/');
        }))

    .get('/tasks.json', (req, res) => getUserData(req)
        .then(data => users.update(data.user).then(() =>
            users.getCompletedTasks(data.user, data.timezone)
                .then(tasks => res.json({ timezone: data.timezone, tasks })))))

    .get('/status.json', (req, res) => db.getCounts()
        .then(counts => res.json(counts)))

    .get('/login', (req, res) => res.redirect(wunderlist.getOAuthUrl()))

    .get('/login/result', (req, res) => wunderlist.getOAuthUser(req.query.state, req.query.code)
        .then(users.create)
        .then(user => users.setToken(user, res).redirect('/review'))
        .catch(err => res.redirect('/')))

    .set('view engine', 'ect')
    .engine('ect', ect({
        watch: true,
        root: __dirname + '/../../views'
    }).render)
    .listen(port, () => console.info('Website started at port ' + port));