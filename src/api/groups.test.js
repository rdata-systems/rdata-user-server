const express = require('../services/express');
const setup = require('../../test/setup');
const config = require('../config');
const request = require('supertest');
const routes = require('./groups');
const mongoose = require('../services/mongoose');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const merge = require('merge');
const querystring = require('querystring');
const url = require('url');
const Group = require('../models/group');

var testUser = {
    id: 1234567,
    roles: [{role: 'readWrite'}]
};

var app;

var groupModels;

beforeEach(function(done) {
    app = express('/', routes);

    var groups = [];
    for(var i=0; i<10; i++) {
        var group = {
            name: 'group'+i,
            users: [new mongoose.mongo.ObjectId(testUser.id)]
        };
        groups.push(group);
    }
    Group.create(groups, function (err, grps) {
        if (err) return done(err);
        groupModels = grps;
        done();
    });
});

afterEach(function(done){
    Group.remove({}, done);
});

describe('/groups', function(){
    describe('GET /', function() {
        it('responds with 401 Unauthorized when there is no access token', function (done) {
            request(app)
                .get('/')
                .expect(401, done);
        });

        it('responds with 200 OK and returns groups', function (done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    assert(res.body.groups);
                    assert.equal(res.body.groups.length, groupModels.length, "group length should be " + groupModels.length);
                    done();
                });
        });
    });

    describe('GET /:groupId', function() {
        it('responds with 400 Bad request - bad object tid', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/NonValidId')
                .set('Authorization', "Bearer " + accessToken)
                .expect(400)
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });

        it('responds with 404 Not found', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/' + new mongoose.Types.ObjectId())
                .set('Authorization', "Bearer " + accessToken)
                .expect(404)
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });

        it('responds with 200 OK and returns group with id', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var group = groupModels[0];
            request(app)
                .get('/'+group._id)
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.group);
                    assert.equal(res.body.group.name, groupModels[0].name, "group name should be " + groupModels[0].name);
                    done();
                });
        });
    });

    describe('POST /', function() {
        it('responds with 409 Name already taken', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .post('/')
                .send({ name: groupModels[0].name, users: groupModels[0].users })
                .set('Authorization', "Bearer " + accessToken)
                .expect(409)
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });

        it('responds with 201 Created and creates group', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var groupName = "testgroup";
            request(app)
                .post('/')
                .send({ name: groupName, users: groupModels[0].users })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.group);
                    assert.equal(res.body.group.name, groupName, "group name should be " + groupName);
                    Group.findOne({name: groupName}, function(err, group){
                        if (err) return done(err);
                        assert(group, "new group doesn't exist in the database");
                        done();
                    });
                });
        });
    });

    describe('PUT /:groupId', function() {
        it('responds with 404 Not found', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .put('/' + new mongoose.Types.ObjectId())
                .send({ name: groupModels[0].name, users: groupModels[0].users })
                .set('Authorization', "Bearer " + accessToken)
                .expect(404)
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });

        it('responds with 409 Name already taken', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .put('/'+groupModels[0]._id)
                .send({ name: groupModels[1].name, users: groupModels[0].users })
                .set('Authorization', "Bearer " + accessToken)
                .expect(409)
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });

        it('responds with 200 and updates group - sets the new name', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var groupName = "newgroupname";
            request(app)
                .put('/'+groupModels[0]._id)
                .send({ name: groupName, users: [] })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.group);
                    assert.equal(res.body.group.name, groupName, "group name should be " + groupName);
                    Group.findById(groupModels[0]._id, function(err, group){
                        if (err) return done(err);
                        assert(group, "group not found");
                        assert.equal(group.name, groupName, "group name should be " + groupName);
                        done();
                    });
                });
        });

        it('responds with 200 and updates group - leaves the same name, adds new user', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var newUserId = new mongoose.Types.ObjectId().toString();
            var users = groupModels[0].users.slice(0);
            users.push(newUserId);
            request(app)
                .put('/'+groupModels[0]._id)
                .send({ name: groupModels[0].name, users: users })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.group);
                    assert(res.body.group.users.includes(newUserId), "group users must include " + newUserId);
                    Group.findById(groupModels[0]._id, function(err, group){
                        if (err) return done(err);
                        assert(group, "group not found");
                        assert(group.toObject().users.includes(newUserId), "group users must include " + newUserId);
                        done();
                    });
                });
        });
    });

    describe('DELETE /:groupId', function() {
        it('responds with 200 OK even if group doesnt exist', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .delete('/' + new mongoose.Types.ObjectId())
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    done();
                });
        });

        it('responds with 200 OK and deletes the group', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var id = groupModels[0]._id;
            request(app)
                .delete('/'+id)
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    Group.findById(id, function(err, group){
                        if (err) return done(err);
                        assert(!group, "group still exists");
                        done();
                    });
                });
        });
    });
});