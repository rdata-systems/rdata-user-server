const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const mongoose = require('../services/mongoose');
const User = require('../models/user');
const InvalidQueryError = require('../errors').InvalidQueryError;
const InvalidQueryIdError = require('../errors').InvalidQueryIdError;
const merge = require('merge');

const router = new express.Router();

router.get('/', passportService.authenticate(), function(req, res, next){

});

router.delete('/', passportService.authenticate(), function(req, res, next){

});

router.put('/', passportService.authenticate(), function(req, res, next){

});

router.post('/', passportService.authenticate(), function(req, res, next){

});
