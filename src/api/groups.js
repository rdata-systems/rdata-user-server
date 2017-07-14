const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const queryParserService = require('../services/queryparser');
const mongoose = require('../services/mongoose');
const Group = require('../models/group');
const User = require('../models/user');
const errors = require('../errors');
const merge = require('merge');

const GroupNameTakenError = function GroupNameTakenError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(GroupNameTakenError, errors.ConflictError);

const router = new express.Router();

router.get('/', passportService.authenticate(), function(req, res, next){
    var query = queryParserService.fromQueryOrBody("query", req);
    var skip = parseInt(req.query.skip) || 0;
    var limit = parseInt(req.query.limit) || 0;
    var sort = req.query.sort ? sortParserService.parse(req.query.sort) : {time: "asc"};

    // TODO: Make this check
    // Filter only user groups unless they .can("read") (all groups)
    var groups;
    Group.find(query).sort(sort).limit(limit).skip(skip).exec()
        .then(function(_groups){
            groups = _groups;
            return Group.count(query).exec();
        })
        .then(function(totalCount){
            return res.json({
                groups: groups.map(function(group){ return group.toObject(); }),
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

router.get('/:groupId', passportService.authenticate(), function(req, res, next){
    if(!req.params.groupId || !mongoose.Types.ObjectId.isValid(req.params.groupId))
        return next(new errors.InvalidQueryError("Invalid groupId"));

    var groupId = new mongoose.mongo.ObjectId(req.params.groupId);

    // TODO: Make this check
    // Filter only user groups unless they .can("read") (all groups)
    Group.findById(groupId).exec()
        .then(function(group){
            if(!group)
                return next(new errors.ResourceNotFoundError("Group not found"));

            res.json({ group: group.toObject() });
        })
        .catch(next);

});

router.post('/', passportService.authenticate(), function(req, res, next){
    if(!req.body.name)
        return next(new errors.InvalidQueryError("Invalid name"));
    if(!req.body.users || !Array.isArray(req.body.users)
        || !req.body.users.every(function(userId){ return mongoose.Types.ObjectId.isValid(userId); }))
        return next(new errors.InvalidQueryError("Invalid users"));

    var name = String(req.body.name).trim().toLowerCase();
    var users = req.body.users.map(function(userId){
        return new mongoose.Types.ObjectId(userId);
    });
    if(users.length === 0)
        users.push(req.user._id);

    Group.findOne({name: name}).exec()
        .then(function(group){
            if(group)
                throw new GroupNameTakenError("Group name is already taken");

            Group.create({name: name, users: users}, function(err, group){
                if(err) return next(err);
                res.json({group: group.toObject()});
            });
        })
        .catch(next);
});

router.put('/:groupId', passportService.authenticate(), function(req, res, next){
    if(!req.params.groupId || !mongoose.Types.ObjectId.isValid(req.params.groupId))
        return next(new errors.InvalidQueryError("Invalid groupId"));
    if(!req.body.name)
        return next(new errors.InvalidQueryError("Invalid name"));
    if(!req.body.users || !Array.isArray(req.body.users)
        || !req.body.users.every(function(userId){ return mongoose.Types.ObjectId.isValid(userId); }))
        return next(new errors.InvalidQueryError("Invalid users"));

    var groupId = new mongoose.mongo.ObjectId(req.params.groupId);
    var name = String(req.body.name).trim().toLowerCase();
    var users = req.body.users.map(function(userId){
        return new mongoose.Types.ObjectId(userId);
    });
    if(users.length === 0)
        users.push(req.user._id);

    Group.findById(groupId).exec()
        .then(function(group){
            if(!group)
                throw new errors.ResourceNotFoundError("Group not found");

            if(name === group.name){ // If name hasn't changed, simply update the group
                Group.findByIdAndUpdate(groupId, {name: name, users: users}, {new: true}).exec()
                    .then(function(group){
                        res.json({group: group.toObject()});
                    })
                    .catch(next);
            }
            else { // If the name has changed, check if it's not taken first
                Group.findOne({name: name, _id: {"$ne": group._id }}).exec()
                    .then(function(group){
                        if(group) {
                            next(new GroupNameTakenError("Group name already taken"));
                        } else {
                            Group.findByIdAndUpdate(groupId, {name: name, users: users}, {new: true}).exec()
                                .then(function (gr) {
                                    res.json({group: gr.toObject()});
                                })
                                .catch(next);
                        }
                    })
                    .catch(next);
            }
        })
        .catch(next);
});

router.delete('/:groupId', passportService.authenticate(), function(req, res, next){
    if(!req.params.groupId || !mongoose.Types.ObjectId.isValid(req.params.groupId))
        return next(new errors.InvalidQueryError("Invalid groupId"));

    var groupId = new mongoose.mongo.ObjectId(req.params.groupId);

    Group.findByIdAndRemove(groupId).exec()
        .then(function(group){
            res.json({});
        })
        .catch(next);
});


module.exports = router;