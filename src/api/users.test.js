const express = require('../services/express');
const setup = require('../../test/setup');
const config = require('../config');
const request = require('supertest');
const routes = require('./users');
const mongoose = require('../services/mongoose');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const merge = require('merge');
const querystring = require('querystring');
const url = require('url');
const User = require('../models/user');

var testUser = {
    id: 1234567,
    roles: [{role: 'readWrite'}]
};

var app;

var userModels;

beforeEach(function(done) {
    app = express('/', routes);

    var users = [];
    for(var i=0; i<10; i++) {
        var user = {
            email: 'user'+i+'@test.com',
            username: 'user'+i,
            password: '123456'
        };
        users.push(user);
    }
    User.create(users, function (err, usrs) {
        if (err) return done(err);
        userModels = usrs;
        done();
    });
});

afterEach(function(done){
    User.remove({}, done);
});

describe('/users', function(){
    describe('GET /', function() {
        it('responds with 401 Unauthorized when there is no access token', function(done){
            request(app)
                .get('/')
                .expect(401, done);
        });

        it('responds with 200 OK and returns users', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.users);
                    assert.equal(res.body.users.length, userModels.length, "user length should be " + userModels.length);
                    assert(!res.body.users[0].password, "user password is present in the output");
                    done();
                });
        });
    });
});