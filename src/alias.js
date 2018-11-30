"use strict";

const pathToRegexp 				= require("path-to-regexp");
const Busboy 					= require("busboy");

const _ 						= require("lodash");

const { MoleculerClientError } = require("moleculer").Errors;
const { removeTrailingSlashes, addSlashes, decodeParam, compose } = require("./utils");

class Alias {
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
			this.handler = compose(...mws);
		} else if (action != null) {
			Object.assign(this, _.cloneDeep(action));
		}

		this.type = this.type || "call";

		this.path = removeTrailingSlashes(this.path);

		this.keys = [];
		this.re = pathToRegexp(this.path, this.keys, {}); // Options: https://github.com/pillarjs/path-to-regexp#usage

		if (this.type == "multipart") {
			// Handle file upload in multipart form
			this.handler = (req, res) => {
				const ctx = req.$ctx;
				const promises = [];

				const busboy = new Busboy(_.defaultsDeep({ headers: req.headers }, this.busboyConfig, route.opts.busboyConfig));
				busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
					promises.push(ctx.call(this.action, file, _.defaultsDeep({}, route.opts.callOptions, { meta: {
						fieldname: fieldname,
						filename: filename,
						encoding: encoding,
						mimetype: mimetype,
					}})));
				});

				busboy.on("finish", () => {
					/* istanbul ignore next */
					if (!promises.length)
						return this.service.sendError(req, res, new MoleculerClientError("File missing in the request"));

					Promise.all(promises).then(data => {
						if (route.onAfterCall)
							return route.onAfterCall.call(this, ctx, route, req, res, data);
						return data;

					}).then(data => {
						this.service.sendResponse(req, res, data, {});

					}).catch(err => {
						/* istanbul ignore next */
						this.service.sendError(req, res, err);
					});
				});

				busboy.on("error", err => {
					/* istanbul ignore next */
					this.service.sendError(req, res, err);
				});

				req.pipe(busboy);

			};
		}

	}

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

	isMethod(method) {
		return this.method === "*" || this.method === method;
	}

	printPath() {
		return `${this.method} ${addSlashes(this.route.path)}${this.path}`;
	}

	toString() {
		return `Alias: ${this.method} ${this.route.path + (this.route.path.endsWith("/") ? "": "/")}${this.path} -> ${this.handler != null ? "<Function>" : this.action}`;
	}
}

module.exports = Alias;
