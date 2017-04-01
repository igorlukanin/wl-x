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
    .use('/static', express.static('static'))

    .get('/', (req, res) => users.getByToken(req)
        .then(user => users.getCompletedTasks(user)
            .then(tasks => res.render('user', {
                user,
                tasks
            })))
        .catch(err => res.render('index')))

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