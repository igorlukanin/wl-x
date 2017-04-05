const compression = require('compression');
const config = require('config');
const cookieParser = require('cookie-parser');
const ect = require('ect');
const express = require('express');

const users = require('../users');
const wunderlist = require('../wunderlist');


const port = config.get('website.port');


express()
    .use(compression())
    .use(cookieParser())

    .use('/', express.static('static'))
    .use('/moment.js', express.static('node_modules/moment/min/moment.min.js'))
    .use('/fonts', express.static('node_modules/lato-font/fonts'))
    .use('/fonts/lato.css', express.static('node_modules/lato-font/css/lato-font.min.css'))

    .get('/', (req, res) => users.getByToken(req)
        .then(user => res.render('user', { user }))
        .catch(err => res.render('index')))

    .get('/tasks.json', (req, res) => users.getByToken(req)
        .then(user => users.getCompletedTasks(user).then(tasks => res.json(tasks))))

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