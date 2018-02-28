/*
 * moleculer
 * Copyright (c) 2017 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { MoleculerError, MoleculerClientError } = require("moleculer").Errors;

const ERR_NO_TOKEN = "ERR_NO_TOKEN";
const ERR_INVALID_TOKEN = "ERR_INVALID_TOKEN";
const ERR_UNABLE_DECODE_PARAM = "ERR_UNABLE_DECODE_PARAM";

/**
 * Invalid request body
 *
 * @class InvalidRequestBodyError
 * @extends {Error}
 */
class InvalidRequestBodyError extends MoleculerError {
	/**
	 * Creates an instance of InvalidRequestBodyError.
	 *
	 * @param {any} body
	 * @param {any} error
	 *
	 * @memberOf InvalidRequestBodyError
	 */
	constructor(body, error) {
		super("Invalid request body", 400, null, {
			body,
			error
		});
	}
}

/**
 * Invalid response type
 *
 * @class InvalidResponseTypeError
 * @extends {Error}
 */
class InvalidResponseTypeError extends MoleculerError {
	/**
	 * Creates an instance of InvalidResponseTypeError.
	 *
	 * @param {String} dataType
	 *
	 * @memberOf InvalidResponseTypeError
	 */
	constructor(dataType) {
		super(`Invalid response type '${dataType}'`, 500, null, {
			dataType
		});
	}
}

/**
 * Unauthorized HTTP error
 *
 * @class UnAuthorizedError
 * @extends {Error}
 */
class UnAuthorizedError extends MoleculerError {
	/**
	 * Creates an instance of UnAuthorizedError.
	 *
	 * @param {String} type
	 * @param {any} data
	 *
	 * @memberOf UnAuthorizedError
	 */
	constructor(type, data) {
		super("Unauthorized", 401, type || ERR_INVALID_TOKEN, data);
	}
}

/**
 * Forbidden HTTP error
 *
 * @class ForbiddenError
 * @extends {Error}
 */
class ForbiddenError extends MoleculerError {
	/**
	 * Creates an instance of ForbiddenError.
	 *
	 * @param {String} type
	 * @param {any} data
	 *
	 * @memberOf ForbiddenError
	 */
	constructor(type, data) {
		super("Forbidden", 403, type, data);
	}
}

/**
 * Bad request HTTP error
 *
 * @class BadRequestError
 * @extends {Error}
 */
class BadRequestError extends MoleculerError {
	/**
	 * Creates an instance of BadRequestError.
	 *
	 * @param {String} type
	 * @param {any} data
	 *
	 * @memberOf BadRequestError
	 */
	constructor(type, data) {
		super("Bad request", 400, type, data);
	}
}

/**
 * Rate limit exceeded HTTP error
 *
 * @class RateLimitExceeded
 * @extends {Error}
 */
class RateLimitExceeded extends MoleculerClientError {
	/**
	 * Creates an instance of RateLimitExceeded.
	 *
	 * @param {String} type
	 * @param {any} data
	 *
	 * @memberOf RateLimitExceeded
	 */
	constructor(type, data) {
		super("Rate limit exceeded", 429, type, data);
	}
}

module.exports = {
	InvalidRequestBodyError,
	InvalidResponseTypeError,
	UnAuthorizedError,
	ForbiddenError,
	BadRequestError,
	RateLimitExceeded,

	ERR_NO_TOKEN,
	ERR_INVALID_TOKEN,
	ERR_UNABLE_DECODE_PARAM
};
