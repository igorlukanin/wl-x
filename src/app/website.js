const compression = require('compression');
const config = require('config');
const ect = require('ect');
const express = require('express');


const port = config.get('website.port');


express()
    .use(compression())
    .use('/static', express.static('static'))

    .get('/', (req, res) => res.render('index'))

    .set('view engine', 'ect')
    .set('views', __dirname + '/../../views')
    .engine('ect', ect({ watch: true }).render)
    .listen(port, () => console.info('Website started at port ' + port));