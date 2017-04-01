const compression = require('compression');
const config = require('config');
const ect = require('ect');
const express = require('express');

const wunderlist = require('../wunderlist');


const port = config.get('website.port');


express()
    .use(compression())
    .use('/static', express.static('static'))

    .get('/', (req, res) => res.render('index'))

    .get('/login', (req, res) => res.redirect(wunderlist.getOAuthUrl()))

    .get('/login/result', (req, res) => wunderlist.getOAuthUser(req.query.state, req.query.code)
        .then(user => res.render('user', { user }))
        .catch(err => res.render('index')))

    .set('view engine', 'ect')
    .set('views', __dirname + '/../../views')
    .engine('ect', ect({ watch: true }).render)
    .listen(port, () => console.info('Website started at port ' + port));