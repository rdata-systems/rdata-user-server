const Router = require('express').Router;
const users = require('./users');
const groups = require('./groups');

const router = new Router();
router.use('/users', users);
router.use('/groups', groups);

module.exports = router;
