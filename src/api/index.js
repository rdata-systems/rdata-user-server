const Router = require('express').Router;
const users = require('./users');

const router = new Router();
router.use('/users', users);

module.exports = router;
