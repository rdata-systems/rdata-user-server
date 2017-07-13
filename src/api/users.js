const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const queryParserService = require('../services/queryparser');
const mongoose = require('../services/mongoose');
const User = require('../models/user');
const errors = require('../errors');
const merge = require('merge');

const router = new express.Router();

router.get('/', passportService.authenticate(), function(req, res, next){
    var query = queryParserService.fromQueryOrBody("query", req);
    var skip = parseInt(req.query.skip) || 0;
    var limit = parseInt(req.query.limit) || 0;
    var sort = req.query.sort ? sortParserService.parse(req.query.sort) : {time: "asc"};

    // TODO: Turn on this check
    //if(!req.user.can("readUsers"))
    //    next(new errors.AuthorizationError("You don't have permissions to query users"));

    var users;
    User.find(query).sort(sort).limit(limit).skip(skip).exec()
        .then(function(_users){
            users = _users.map(function(user){ return user.toObject() });
            return User.count(query).exec();
        })
        .then(function(totalCount){
            return res.json({
                users: users,
                meta: {
                    total: totalCount
                },
                links: {
                    pages: paginateService.getPageLinks(skip, limit, totalCount, req.url)
                }
            });
        })
        .catch(next);

});

module.exports = router;