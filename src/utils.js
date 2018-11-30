"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

const { BadRequestError, ERR_UNABLE_DECODE_PARAM } = require("./errors");
const { MoleculerError } = require("moleculer").Errors;

/**
 * Decode URI encoded param
 * @param {String} param
 */
function decodeParam(param) {
	try {
		return decodeURIComponent(param);
	} catch (_) {
		/* istanbul ignore next */
		throw BadRequestError(ERR_UNABLE_DECODE_PARAM, { param });
	}
}

// Remove slashes "/" from the left & right sides
function removeTrailingSlashes(s) {
	if (s.startsWith("/"))
		s = s.slice(1);
	if (s.endsWith("/"))
		s = s.slice(0, -1);
	return s;
}

// Add slashes "/" to the left & right sides
function addSlashes(s) {
	return (s.startsWith("/") ? "" : "/") + s + (s.endsWith("/") ? "" : "/");
}

// Normalize URL path (remove multiple slashes //)
function normalizePath(s) {
	return s.replace(/\/{2,}/g, "/");
}

/**
 * Compose middlewares
 *
 * @param {...Function} mws
 */
function compose(...mws) {
	return (req, res, done) => {
		const next = (i, err) => {
			if (i >= mws.length) {
				if (_.isFunction(done))
					return done.call(this, err);

				/* istanbul ignore next */
				return;
			}

			if (err) {
				// Call only error middlewares (err, req, res, next)
				if (mws[i].length == 4)
					mws[i].call(this, err, req, res, err => next(i + 1, err));
				else
					next(i + 1, err);
			} else {
				if (mws[i].length < 4)
					mws[i].call(this, req, res, err => next(i + 1, err));
				else
					next(i + 1);
			}
		};

		return next(0);
	};
}

/**
 * Compose middlewares and return Promise
 * @param {...Function} mws
 * @returns {Promise}
 */
function composeThen(req, res, ...mws) {
	return new Promise((resolve, reject) => {
		compose(...mws)(req, res, err => {
			if (err) {
				/* istanbul ignore next */
				if (err instanceof MoleculerError)
					return reject(err);

				/* istanbul ignore next */
				if (err instanceof Error)
					return reject(new MoleculerError(err.message, err.code || err.status, err.type)); // TODO err.stack

				/* istanbul ignore next */
				return reject(new MoleculerError(err));
			}

			resolve();
		});
	});
}

module.exports = {
	removeTrailingSlashes,
	addSlashes,
	normalizePath,
	decodeParam,
	compose,
	composeThen
};
