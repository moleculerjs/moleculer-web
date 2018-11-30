"use strict";

const { BadRequestError, ERR_UNABLE_DECODE_PARAM } = require("./errors");

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

module.exports = {
	removeTrailingSlashes,
	addSlashes,
	normalizePath,
	decodeParam
};
