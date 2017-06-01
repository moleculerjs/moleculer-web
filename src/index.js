/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const http 				= require("http");
const https 			= require("https");
const queryString 		= require("querystring");

const _ 				= require("lodash");
const bodyParser 		= require("body-parser");
const serveStatic 		= require("serve-static");
const nanomatch  		= require("nanomatch");
const isStream  		= require("isstream");
const pathToRegexp 		= require("path-to-regexp");

const { ServiceNotFoundError } = require("moleculer").Errors;
const { InvalidRequestBodyError, BadRequestError, ERR_UNABLE_DECODE_PARAM } = require("./errors");

function decodeParam(param) {
	try {
		return decodeURIComponent(param);
	} catch (_) {
		throw BadRequestError(ERR_UNABLE_DECODE_PARAM, { param });
	}
}

/**
 * Official API Gateway service for Moleculer
 */
module.exports = {

	// Service name
	name: "api-gw",

	// Default settings
	settings: {
		middleware: false,

		// Exposed port
		port: process.env.PORT || 3000,

		// Exposed IP
		ip: process.env.IP || "0.0.0.0",

		routes: [
			{
				// Path prefix to this route
				path: "/",

				bodyParsers: {
					json: true
				}
			}			
		]

	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		if (!this.settings.middleware) {
			// Create HTTP or HTTPS server
			if (this.settings.https && this.settings.https.key && this.settings.https.cert) {
				this.server = https.createServer(this.settings.https, this.httpHandler);
				this.isHTTPS = true;
			} else {
				this.server = http.createServer(this.httpHandler);
				this.isHTTPS = false;
			}

			/* istanbul ignore next */
			this.server.on("error", err => {
				this.logger.error("Server error", err);
			});

			/*this.server.on("connection", socket => {
				// Disable Nagle algorithm https://nodejs.org/dist/latest-v6.x/docs/api/net.html#net_socket_setnodelay_nodelay
				socket.setNoDelay(true);
			});*/
		}

		// Create static server middleware
		if (this.settings.assets) {
			const opts = this.settings.assets.options || {};
			opts.fallthrough = false;
			this.serve = serveStatic(this.settings.assets.folder, opts);
		}

		// Process routes
		if (Array.isArray(this.settings.routes)) {
			this.routes = this.settings.routes.map(route => this.createRoute(route));
		}

		this.logger.info("API Gateway created!");
	},

	methods: {

		/**
		 * Create route object from options
		 * 
		 * @param {Object} opts 
		 * @returns {Object}
		 */
		createRoute(opts) {
			let route = {
				opts
			};
			if (opts.authorization) {
				if (!_.isFunction(this.authorize)) {
					this.logger.warn("If you would like to use authorization, please add the 'authorize' method to the service!");
					route.authorization = false;
				} else
					route.authorization = true;
			}


			// Handle whitelist
			route.whitelist = opts.whitelist;
			route.hasWhitelist = Array.isArray(route.whitelist);

			// Create body parsers
			if (opts.bodyParsers) {
				const bps = opts.bodyParsers;
				const parsers = [];
				Object.keys(bps).forEach(key => {
					const opts = _.isObject(bps[key]) ? bps[key] : undefined;
					if (bps[key] !== false)
						parsers.push(bodyParser[key](opts));
				});

				route.parsers = parsers;
			}

			if (opts.onBeforeCall)
				route.onBeforeCall = this.Promise.method(opts.onBeforeCall);

			if (opts.onAfterCall)
				route.onAfterCall = this.Promise.method(opts.onAfterCall);

			// Create URL prefix
			route.path = (this.settings.path || "") + (opts.path || "");
			route.path = route.path || "/";

			//route.urlRegex = new RegExp(route.path.replace("/", "\\/") + "\\/([\\w\\.\\~\\/]+)", "g");

			// Handle aliases
			if (opts.aliases && Object.keys(opts.aliases).length > 0) {
				route.aliases = [];
				_.forIn(opts.aliases, (action, matchPath) => {
					let method = "*";
					if (matchPath.indexOf(" ") !== -1) {
						const p = matchPath.split(" ");
						method = p[0];
						matchPath = p[1];
					}
					let keys = [];
					const re = pathToRegexp(matchPath, keys, {}); // Options: https://github.com/pillarjs/path-to-regexp#usage

					route.aliases.push({
						action,
						method,
						re, 
						match: url => {
							const m = re.exec(url);
							if (!m) return false;

							const params = {};

							let key, param;
							for (let i = 0; i < keys.length; i++) {
								key = keys[i];
								param = m[i + 1];
								if (!param) continue;

								params[key.name] = decodeParam(param);

								if (key.repeat) 
									params[key.name] = params[key.name].split(key.delimiter);
							}

							return params;
						}
					});
				});
			}

			return route;
		},

		/**
		 * Send 404 response
		 * 
		 * @param {HttpRequest} req 
		 * @param {HttpResponse} res 
		 */
		send404(req, res) {
			res.writeHead(404);
			res.end("Not found");
		},

		/**
		 * HTTP request handler
		 * 
		 * @param {HttpRequest} req 
		 * @param {HttpResponse} res 
		 * @param {Function} Call next middleware (for Express)
		 * @returns 
		 */
		httpHandler(req, res, next) {
			this.logger.debug("");
			this.logger.debug(`${req.method} ${req.url}`);

			try {
				// Split URL & query params
				let url;
				let query;
				const questionIdx = req.url.indexOf("?", 1);
				if (questionIdx === -1) {
					url = req.url;
				} else {
					query = queryString.parse(req.url.substring(questionIdx + 1));
					url = req.url.substring(0, questionIdx);
				}

				// Trim trailing slash
				if (url.endsWith("/"))
					url = url.slice(0, -1);

				// Check the URL is an API request
				if (this.routes && this.routes.length > 0) {
					for(let i = 0; i < this.routes.length; i++) {
						const route = this.routes[i];
						/*
						this.urlRegex.lastIndex = 0;
						const match = this.urlRegex.exec(url);
						if (match) {
						*/
						if (url.startsWith(route.path)) {
							// Resolve action name
							//let actionName = match[1].replace(/~/, "$").replace(/\//g, ".");
							let actionName = url.slice(route.path.length);
							if (actionName.startsWith("/"))
								actionName = actionName.slice(1);

							actionName = actionName.replace(/~/, "$");

							return this.callAction(route, actionName, req, res, query);
						} 
					}
				}

				// Serve assets static files
				if (this.serve) {
					this.serve(req, res, err => {
						this.logger.debug(err);
						this.send404(req, res);
					});
					return;
				} 

				if (next) {
					next();
				} else {
					// 404
					this.send404(req, res);
				}

			} catch(err) {
				/* istanbul ignore next */
				this.logger.error("Handler error!", err);

				/* istanbul ignore next */
				if (next)
					return next();

				/* istanbul ignore next */
				res.writeHead(500);
				/* istanbul ignore next */
				res.end("Server error! " + err.message);				
			}
		},

		/**
		 * Middleware for ExpressJS
		 * 
		 * @returns 
		 */
		express() {
			return (req, res, next) => this.httpHandler(req, res, next);
		},

		/**
		 * Call an action with broker
		 * 
		 * @param {Object} route 		Route options
		 * @param {String} actionName 	Name of action
		 * @param {HttpRequest} req 	Request object
		 * @param {HttpResponse} res 	Response object
		 * @param {Object} query		Parsed query string
		 * @returns {Promise}
		 */
		callAction(route, actionName, req, res, query) {
			let params = {};
			let endpoint;

			return this.Promise.resolve()

			// Resolve aliases
			.then(() => {
				if (route.aliases && route.aliases.length > 0) {
					const alias = this.resolveAlias(route, actionName, req.method);
					if (alias) {
						this.logger.debug(`  Alias: ${req.method} ${actionName} -> ${alias.action}`);
						actionName = alias.action;
						Object.assign(params, alias.params);
						this.logger.debug("Params:", params);
					}
				}
				actionName = actionName.replace(/\//g, ".");
			})

			// Whitelist check
			.then(() => {
				if (route.hasWhitelist) {
					if (!this.checkWhitelist(route, actionName)) {
						this.logger.debug(`  The '${actionName}' action is not in the whitelist!`);
						return this.Promise.reject(new ServiceNotFoundError(actionName));
					}
				}
			})

			// Parse body
			.then(() => {
				
				if (["POST", "PUT", "PATCH"].indexOf(req.method) !== -1 && route.parsers && route.parsers.length > 0) {
					return this.Promise.mapSeries(route.parsers, parser => {
						return new this.Promise((resolve, reject) => {
							parser(req, res, err => {
								if (err) {
									return reject(new InvalidRequestBodyError(err.body, err.message));
								}

								resolve();
							});
						});
					});
				}
			})

			// Merge params
			.then(() => {
				Object.assign(params, query);
				if (_.isObject(req.body)) 
					Object.assign(params, req.body);
			})

			// Resolve action by name
			.then(() => {
				endpoint = this.broker.getAction(actionName);
				if (endpoint) {
					// Validate params
					if (this.broker.validator && endpoint.action.params)
						this.broker.validator.validate(params, endpoint.action.params);					
				} else {
					// Action is not available
					return this.Promise.reject(new ServiceNotFoundError(actionName));
				}

				return endpoint;
			})

			// Create a new context for request
			.then(() => {
				this.logger.info(`  Call '${actionName}' action with params:`, params);

				const restAction = {
					name: this.name + ".rest"
				};

				// Create a new context to wrap the request
				const ctx = this.broker.createNewContext(restAction, null, params, {
					//timeout: 5 * 1000
				});
				ctx.requestID = ctx.id;
				ctx._metricStart(ctx.metrics);
				//ctx.endpoint = endpoint;

				return ctx;
			})

			// Authorization
			.then(ctx => {
				if (route.authorization) {
					return this.authorize(ctx, route, req, res).then(() => {
						return ctx;
					});
				}
				return ctx;
			})

			// onBeforeCall handling
			.then(ctx => {
				if (route.onBeforeCall) {
					return route.onBeforeCall.call(this, ctx, route, req, res).then(() => {
						return ctx;
					});
				}
				return ctx;
			})

			// Call the action
			.then(ctx => {
				return ctx.call(endpoint, params)
					.then(data => {
						res.statusCode = 200;

						// Override responseType by action
						const responseType = endpoint.action.responseType;

						// Return with the response
						if (ctx.requestID)
							res.setHeader("Request-Id", ctx.requestID);

						return Promise.resolve()
							// onAfterCall handling
							.then(() => {
								if (route.onAfterCall)
									return route.onAfterCall.call(this, ctx, route, req, res, data);
							})
							.then(() => {
								//try {
								this.sendResponse(res, data, responseType);
								//} catch(err) {
									/* istanbul ignore next */
								//	return this.Promise.reject(new InvalidResponseTypeError(typeof(data)));
								//}

								ctx._metricFinish(null, ctx.metrics);								
							});
					});
			})

			// Error handling
			.catch(err => {				
				this.logger.error("  Calling error!", err.name, ":", err.message, "\n", err.stack, "\nData:", err.data);
				
				const headers = { 
					"Content-type": "application/json"					
				};
				if (err.ctx) {
					headers["Request-Id"] = err.ctx.id;
				}

				// Return with the error
				const code = _.isNumber(err.code) ? err.code : 500;
				res.writeHead(code, headers);
				const errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
				res.end(JSON.stringify(errObj, null, 2));

				if (err.ctx)
					err.ctx._metricFinish(null, err.ctx.metrics);
			});
		},

		/**
		 * Convert data & send back to client
		 * 
		 * @param {HttpResponse} res 
		 * @param {any} data 
		 * @param {String|null} responseType 
		 */
		sendResponse(res, data, responseType) {
			if (data == null) {
				res.end();
			}
			// Buffer
			else if (Buffer.isBuffer(data)) {
				res.setHeader("Content-Type", responseType || "application/octet-stream");
				res.setHeader("Content-Length", data.length);
				res.end(data);
			} 
			// Buffer from JSON
			else if (_.isObject(data) && data.type == "Buffer") {
				const buf = Buffer.from(data);
				res.setHeader("Content-Type", responseType || "application/octet-stream");
				res.setHeader("Content-Length", buf.length);
				res.end(buf);
			} 
			// Stream
			else if (isStream(data)) {
				res.setHeader("Content-Type", responseType || "application/octet-stream");
				data.pipe(res);
			} 
			// Object or Array
			else if (_.isObject(data) || Array.isArray(data)) {
				res.setHeader("Content-Type", responseType || "application/json");
				res.end(JSON.stringify(data));
			} 
			// Other
			else {
				if (!responseType) {
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify(data));
				} else {
					res.setHeader("Content-Type", responseType);
					if (_.isString(data))
						res.end(data);
					else
						res.end(data.toString());
				}
			}			
		},

		/**
		 * Check the action name in whitelist
		 * 
		 * @param {Object} route 
		 * @param {String} action 
		 * @returns {Boolean}
		 */
		checkWhitelist(route, action) {
			return route.whitelist.find(mask => {
				if (_.isString(mask)) {
					return nanomatch.isMatch(action, mask, { unixify: false });
				}
				else if (_.isRegExp(mask)) {
					return mask.test(action);
				}
			}) != null;
		},

		/**
		 * Resolve alias names
		 * 
		 * @param {Object} route 
		 * @param {String} url 
		 * @param {string} [method="GET"] 
		 * @returns {String} Resolved actionName
		 */
		resolveAlias(route, url, method = "GET") {
			for(let i = 0; i < route.aliases.length; i++) {
				const alias = route.aliases[i];
				if (alias.method === "*" || alias.method === method) {
					const res = alias.match(url);
					if (res) {
						return {
							action: alias.action,
							params: res
						};
					}
				}
			}
			return false;
		}

	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {
		if (this.settings.middleware)
			return;

		/* istanbul ignore next */
		this.server.listen(this.settings.port, this.settings.ip, err => {
			if (err) 
				return this.logger.error("API Gateway listen error!", err);

			const addr = this.server.address();
			this.logger.info(`API Gateway listening on ${this.isHTTPS ? "https" : "http"}://${addr.address}:${addr.port}`);
		});		
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {
		if (this.settings.middleware)
			return;

		if (this.server.listening) {
			/* istanbul ignore next */
			this.server.close(err => {
				if (err) 
					return this.logger.error("API Gateway close error!", err);

				this.logger.info("API Gateway stopped!");			
			});
		}
	},

	actions: {
		// Virtual action
		rest() {}
	}

};