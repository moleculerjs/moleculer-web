/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const pathToRegexp 				= require("path-to-regexp");
const Busboy 					= require("@fastify/busboy");
const kleur 					= require("kleur");
const _ 						= require("lodash");

const { PayloadTooLarge } = require("./errors");
const { MoleculerClientError } = require("moleculer").Errors;
const { removeTrailingSlashes, addSlashes, decodeParam, compose } = require("./utils");

class Alias {

	/**
	 * Constructor of Alias
	 *
	 * @param {Service} service
	 * @param {Object} route
	 * @param {Object} opts
	 * @param {any} action
	 */
	constructor(service, route, opts, action) {
		this.service = service;
		this.route = route;
		this.type = "call";
		this.method = "*";
		this.path = null;
		this.handler = null;
		this.action = null;

		if (_.isString(opts)) {
			// Parse alias string
			if (opts.indexOf(" ") !== -1) {
				const p = opts.split(/\s+/);
				this.method = p[0];
				this.path = p[1];
			} else {
				this.path = opts;
			}
		} else if (_.isObject(opts)) {
			Object.assign(this, _.cloneDeep(opts));
		}

		if (_.isString(action)) {
			// Parse type from action name
			if (action.indexOf(":") > 0) {
				const p = action.split(":");
				this.type = p[0];
				this.action = p[1];
			} else {
				this.action = action;
			}
		} else if (_.isFunction(action)) {
			this.handler = action;
			this.action = null;
		} else if (Array.isArray(action)) {
			const mws = _.compact(action.map(mw => {
				if (_.isString(mw))
					this.action = mw;
				else if(_.isFunction(mw))
					return mw;
			}));
			this.handler = compose.call(service, ...mws);
		} else if (action != null) {
			Object.assign(this, _.cloneDeep(action));
		}

		this.type = this.type || "call";

		this.path = removeTrailingSlashes(this.path);

		this.fullPath = this.fullPath || (addSlashes(this.route.path) + this.path);
		if (this.fullPath !== "/" && this.fullPath.endsWith("/")) {
			this.fullPath = this.fullPath.slice(0, -1);
		}

		this.keys = [];
		this.re = pathToRegexp(this.fullPath, this.keys, route.opts.pathToRegexpOptions || {}); // Options: https://github.com/pillarjs/path-to-regexp#usage

		if (this.type == "multipart") {
			// Handle file upload in multipart form
			this.handler = this.multipartHandler.bind(this);
		}
	}

	/**
	 *
	 * @param {*} url
	 */
	match(url) {
		const m = this.re.exec(url);
		if (!m) return false;

		const params = {};

		let key, param;
		for (let i = 0; i < this.keys.length; i++) {
			key = this.keys[i];
			param = m[i + 1];
			if (!param) continue;

			params[key.name] = decodeParam(param);

			if (key.repeat)
				params[key.name] = params[key.name].split(key.delimiter);
		}

		return params;
	}

	/**
	 *
	 * @param {*} method
	 */
	isMethod(method) {
		return this.method === "*" || this.method === method;
	}

	/**
	 *
	 */
	printPath() {
		/* istanbul ignore next */
		return `${this.method} ${this.fullPath}`;
	}

	/**
	 *
	 */
	toString() {
		return kleur.magenta(_.padStart(this.method, 6)) + " " + kleur.cyan(this.fullPath) + kleur.grey(" => ") + (this.handler != null && this.type !== "multipart" ? "<Function>" : this.action);
	}

	/**
	 *
	 * @param {*} req
	 * @param {*} res
	 */
	multipartHandler(req, res) {
		const ctx = req.$ctx;
		ctx.meta.$multipart = {};
		const promises = [];

		let numOfFiles = 0;
		let hasField = false;

		const busboyOptions = _.defaultsDeep({ headers: req.headers }, this.busboyConfig, this.route.opts.busboyConfig);
		const busboy = new Busboy(busboyOptions);
		busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
			file.on("limit", () => {
				// This file reached the file size limit.
				if (_.isFunction(busboyOptions.onFileSizeLimit)) {
					busboyOptions.onFileSizeLimit.call(this.service, file, busboy);
				}
				file.destroy();
				busboy.emit("error", new PayloadTooLarge({ fieldname, filename, encoding, mimetype }));
			});
			file.on("error", err => {
				busboy.emit("error", err);
			});
			numOfFiles++;
			promises.push(ctx.call(this.action, file, _.defaultsDeep({}, this.route.opts.callOptions, { meta: {
				fieldname: fieldname,
				filename: filename,
				encoding: encoding,
				mimetype: mimetype,
				$params: req.$params,
			} })).catch(err => {
				file.resume(); // Drain file stream to continue processing form
				busboy.emit("error", err);
				return err;
			}));
		});
		busboy.on("field", (field, value) => {
			hasField = true;
			ctx.meta.$multipart[field] = value;
		});

		busboy.on("finish", async () => {
			/* istanbul ignore next */
			if (!busboyOptions.empty && numOfFiles == 0)
				return this.service.sendError(req, res, new MoleculerClientError("File missing in the request"));

			// Call the action if no files but multipart fields
			if (numOfFiles == 0 && hasField) {
				promises.push(ctx.call(this.action, {}, _.defaultsDeep({}, this.route.opts.callOptions, { meta: {
					$params: req.$params,
				} })));
			}

			try {
				let data = await this.service.Promise.all(promises);
				const fileLimit = busboyOptions.limits && busboyOptions.limits.files != null ? busboyOptions.limits.files : null;
				if (numOfFiles == 1 && fileLimit == 1) {
					// Remove the array wrapping
					data = data[0];
				}
				if (this.route.onAfterCall)
					data = await this.route.onAfterCall.call(this, ctx, this.route, req, res, data);

				this.service.sendResponse(req, res, data, {});

			} catch(err) {
				/* istanbul ignore next */
				this.service.sendError(req, res, err);
			}
		});

		/* istanbul ignore next */
		busboy.once("error", err => {
			req.unpipe(req.busboy);
			req.resume();
			this.service.sendError(req, res, err);
		});

		// Add limit event handlers
		if (_.isFunction(busboyOptions.onPartsLimit)) {
			busboy.on("partsLimit", () => busboyOptions.onPartsLimit.call(this.service, busboy, this, this.service));
		}

		if (_.isFunction(busboyOptions.onFilesLimit)) {
			busboy.on("filesLimit", () => busboyOptions.onFilesLimit.call(this.service, busboy, this, this.service));
		}

		if (_.isFunction(busboyOptions.onFieldsLimit)) {
			busboy.on("fieldsLimit", () => busboyOptions.onFieldsLimit.call(this.service, busboy, this, this.service));
		}

		req.pipe(busboy);
	}
}

module.exports = Alias;
