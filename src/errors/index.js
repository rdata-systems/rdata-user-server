'use strict';

const ClientError = function ClientError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(ClientError, Error);


const AuthorizationError = function UnauthorizedError(message, extra){
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(AuthorizationError, ClientError);



module.exports.ClientError = ClientError;
module.exports.AuthorizationError = AuthorizationError;