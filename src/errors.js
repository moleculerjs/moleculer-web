/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const ExtendableError = require("es6-error");

/**
 * Invalid request body
 * 
 * @class InvalidRequestBodyError
 * @extends {Error}
 */
class InvalidRequestBodyError extends ExtendableError {
	/**
	 * Creates an instance of InvalidRequestBodyError.
	 * 
	 * @param {any} body
	 * @param {any} error
	 * 
	 * @memberOf InvalidRequestBodyError
	 */
	constructor(body, error) {
		super("Invalid request body");
		this.code = 400;
		this.data = {
			body, 
			error
		};
	}
}

/**
 * Invalid response type
 * 
 * @class InvalidResponseType
 * @extends {Error}
 */
class InvalidResponseType extends ExtendableError {
	/**
	 * Creates an instance of InvalidResponseType.
	 * 
	 * @param {String} dataType
	 * 
	 * @memberOf InvalidResponseType
	 */
	constructor(dataType) {
		super(`Invalid response type '${dataType}'`);
		this.code = 500;
	}
}

module.exports = {
	InvalidRequestBodyError,
	InvalidResponseType
};