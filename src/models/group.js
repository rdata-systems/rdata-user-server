'use strict';

const mongoose = require('mongoose')
    , Schema = mongoose.Schema;

const groupSchema = new Schema({
    name: {
        type: String,
        match: /^[A-Za-z0-9-_. ]+$/,
        required: true,
        unique: true,
        trim: true,
        lowercase: false,
        index: true
    },
    users : [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true
});

if (!groupSchema.options.toObject) groupSchema.options.toObject = {};
groupSchema.options.toObject.transform = function transform(doc, ret, options) {
    return {
        id: ret._id,
        name: ret.name,
        users: ret.users.map(function(user){
            if(user instanceof mongoose.Types.ObjectId)
                return user.toString();
            else
                return user;
        })
    }
};

groupSchema.methods.toJwtObject = function serialize(){
    return this.toObject();
};

const Group = mongoose.model('Group', groupSchema, 'groups');

module.exports = Group;
