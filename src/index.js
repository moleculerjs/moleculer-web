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

const { Context } = require("moleculer");
const { MoleculerError, ServiceNotFoundError } = require("moleculer").Errors;
const { InvalidRequestBodyError, BadRequestError, RateLimitExceeded, ERR_UNABLE_DECODE_PARAM } = require("./errors");

const MemoryStore		= require("./memory-store");

const MAPPING_POLICY_ALL		= "all";
const MAPPING_POLICY_RESTRICT	= "restrict";

function decodeParam(param) {
	try {
		return decodeURIComponent(param);
	} catch (_) {
		/* istanbul ignore next */
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
		// Middleware mode for ExpressJS
		middleware: false,

		// Exposed port
		port: process.env.PORT || 3000,

		// Exposed IP
		ip: process.env.IP || "0.0.0.0",

		// Routes
		routes: [
			{
				// Path prefix to this route
				path: "/",

				bodyParsers: {
					json: true
				}
			}
		],

		// Log the request ctx.params (default to "debug" level)
		logRequestParams: "debug",

		// Log the response data (default to disable)
		logResponseData: null
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.Promise.config({
			cancellation: true
		});

		if (!this.settings.middleware) {
			// Create HTTP or HTTPS server (if not running as middleware)
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
		}

		// Create static server middleware
		if (this.settings.assets) {
			const opts = this.settings.assets.options || {};
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
			this.logger.info(`Register route to '${opts.path}'`);
			let route = {
				opts,
				middlewares: []
			};
			if (opts.authorization) {
				if (!_.isFunction(this.authorize)) {
					this.logger.warn("Please define 'authorize' method in the service to authorization.");
					route.authorization = false;
				} else
					route.authorization = true;
			}

			// Call options
			route.callOptions = opts.callOptions;

			// Middlewares
			if (opts.use && Array.isArray(opts.use) && opts.use.length > 0) {

				route.middlewares = opts.use;

				route.callMiddlewares = (req, res, next) => {
					const nextFn = (i, err) => {
						if (i >= route.middlewares.length || err)
							return next.call(this, req, res, err);

						route.middlewares[i].call(this, req, res, err => nextFn(i + 1, err));
					};

					return nextFn(0);
				};

				this.logger.info(`  Registered ${route.middlewares.length} middlewares.`);
			}

			// CORS
			if (this.settings.cors || opts.cors) {
				// Merge cors settings
				route.cors = Object.assign({}, {
					origin: "*",
					methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
				}, this.settings.cors, opts.cors);
			} else {
				route.cors = null;
			}

			// Rate limiter (Inspired by https://github.com/dotcypress/micro-ratelimit/)
			if (this.settings.rateLimit) {
				let opts = Object.assign({}, {
					window: 60 * 1000,
					limit: 30,
					headers: false,
					key: (req) => {
						return req.headers["x-forwarded-for"] ||
							req.connection.remoteAddress ||
							req.socket.remoteAddress ||
							req.connection.socket.remoteAddress;
					}
				}, this.settings.rateLimit);

				route.rateLimit = opts;

				if (opts.StoreFactory)
					route.rateLimit.store = new opts.StoreFactory(opts.window, opts);
				else
					route.rateLimit.store = new MemoryStore(opts.window, opts);

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

			// `onBeforeCall` handler
			if (opts.onBeforeCall)
				route.onBeforeCall = this.Promise.method(opts.onBeforeCall);

			// `onBeforeCall` handler
			if (opts.onAfterCall)
				route.onAfterCall = this.Promise.method(opts.onAfterCall);

			// Create URL prefix
			route.path = (this.settings.path || "") + (opts.path || "");
			route.path = route.path || "/";

			// Helper for aliased routes
			const createAliasedRoute = (action, matchPath) => {
				let method = "*";
				if (matchPath.indexOf(" ") !== -1) {
					const p = matchPath.split(" ");
					method = p[0];
					matchPath = p[1];
				}
				if (matchPath.startsWith("/"))
					matchPath = matchPath.slice(1);

				let keys = [];
				const re = pathToRegexp(matchPath, keys, {}); // Options: https://github.com/pillarjs/path-to-regexp#usage

				this.logger.info(`  Alias: ${method} ${route.path + (route.path.endsWith("/") ? "": "/")}${matchPath} -> ${_.isFunction(action) ? "<Function>" : action}`);
				return {
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
				};
			};

			// Handle aliases
			if (opts.aliases && Object.keys(opts.aliases).length > 0) {
				route.aliases = [];
				_.forIn(opts.aliases, (action, matchPath) => {
					if (matchPath.startsWith("REST ")) {
						const p = matchPath.split(" ");
						const pathName = p[1];

						// Generate RESTful API. More info http://www.restapitutorial.com/
						route.aliases.push(createAliasedRoute(`${action}.list`,   `GET ${pathName}`));
						route.aliases.push(createAliasedRoute(`${action}.get`,	  `GET ${pathName}/:id`));
						route.aliases.push(createAliasedRoute(`${action}.create`, `POST ${pathName}`));
						route.aliases.push(createAliasedRoute(`${action}.update`, `PUT ${pathName}/:id`));
						//route.aliases.push(createAliasedRoute(`${action}.update`, `PATCH ${pathName}/:id`));
						route.aliases.push(createAliasedRoute(`${action}.remove`, `DELETE ${pathName}/:id`));

					} else {
						route.aliases.push(createAliasedRoute(action, matchPath));
					}
				});
			}

			route.mappingPolicy = opts.mappingPolicy || MAPPING_POLICY_ALL;

			return route;
		},

		/**
		 * Send 404 response
		 *
		 * @param {HttpResponse} res
		 * @param {Function} next - `next` callback in middleware mode
		 */
		send404(res, next) {
			if (next)
				return next();

			this.sendError(res, new MoleculerError("Not found", 404));
		},

		/**
		 * Send an error response
		 *
		 * @param {HttpResponse} res
		 * @param {Error} err
		 * @param {Function} next - `next` callback in middleware mode
		 */
		sendError(res, err, next) {
			if (next)
				return next(err);

			if (!err || !(err instanceof Error)) {
				res.writeHead(500);
				res.end("Internal Server Error");
				return;
			}

			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");

			const code = _.isNumber(err.code) ? err.code : 500;
			res.writeHead(code);
			const errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
			res.end(JSON.stringify(errObj, null, 2));
		},

		/**
		 * Send 302 Redirect
		 *
		 * @param {HttpResponse} res
		 * @param {String} url
		 * @param {Number} status code
		 */
		sendRedirect(res, url, code = 302) {
			res.writeHead(code, {
				"Location": url
			});
			res.end();
		},

		/**
		 * Split the URL and resolve vars from querystring
		 *
		 * @param {any} req
		 * @returns
		 */
		processQueryString(req) {
			// Split URL & query params
			let url = req.url;
			let query = {};
			const questionIdx = req.url.indexOf("?", 1);
			if (questionIdx !== -1) {
				query = queryString.parse(req.url.substring(questionIdx + 1));
				url = req.url.substring(0, questionIdx);
			}
			// req.query = query;

			return {query, url};
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
			this.logger.info(`${req.method} ${req.url}`);

			try {
				// Split URL & query params
				let {query, url} = this.processQueryString(req);

				// Trim trailing slash
				if (url.length > 1 && url.endsWith("/"))
					url = url.slice(0, -1);

				// Check the URL
				if (this.routes && this.routes.length > 0) {
					for(let i = 0; i < this.routes.length; i++) {
						const route = this.routes[i];

						if (url.startsWith(route.path)) {

							let nextCall = () => {
								// Resolve action name
								let urlPath = url.slice(route.path.length);
								if (urlPath.startsWith("/"))
									urlPath = urlPath.slice(1);

								urlPath = urlPath.replace(/~/, "$");
								let actionName = urlPath;

								// Resolve aliases
								if (route.aliases && route.aliases.length > 0) {
									const alias = this.resolveAlias(route, urlPath, req.method);
									if (alias) {
										this.logger.debug(`  Alias: ${req.method} ${urlPath} -> ${alias.action}`);
										actionName = alias.action;
										Object.assign(query, alias.params);

										// Custom Action handler
										if (_.isFunction(alias.action)) {
											return alias.action.call(this, route, req, res);
										}
									} else if (route.mappingPolicy == MAPPING_POLICY_RESTRICT) {
										// Blocking direct access
										return this.send404(res, next);
									}
								}
								actionName = actionName.replace(/\//g, ".");

								if (route.opts.camelCaseNames) {
									actionName = actionName.split(".").map(part => _.camelCase(part)).join(".");
								}

								return this.callAction(route, actionName, req, res, query);
							};

							// Call middlewares
							if (route.callMiddlewares) {
								req.locals = req.locals || {};
								route.callMiddlewares(req, res, (req, res, err) => {
									if (err) {
										this.logger.error("Middleware error!", err);
										return this.sendError(res, err, next);
									}
									nextCall();
								});
							} else {
								nextCall();
							}

							return;
						}
					}
				}

				// Serve assets static files
				if (this.serve) {
					this.serve(req, res, err => {
						this.logger.debug(err);
						this.send404(res, next);
					});
					return;
				}

				// If no route, send 404
				this.send404(res, next);

			} catch(err) {
				this.logger.error("Handler error!", err);
				return this.sendError(res, err, next);
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
		 * Call an action via broker
		 *
		 * @param {Object} route 		Route options
		 * @param {String} actionName 	Name of action
		 * @param {HttpRequest} req 	Request object
		 * @param {HttpResponse} res 	Response object
		 * @param {Object} params		Merged query params + named parameters from URL
		 * @returns {Promise}
		 */
		callAction(route, actionName, req, res, params) {
			let endpoint;

			const p = this.Promise.resolve()

				// Whitelist check
				.then(() => {
					if (route.hasWhitelist) {
						if (!this.checkWhitelist(route, actionName)) {
							this.logger.debug(`  The '${actionName}' action is not in the whitelist!`);
							return this.Promise.reject(new ServiceNotFoundError(actionName));
						}
					}
				})

				// Rate limiter
				.then(() => {
					if (route.rateLimit) {
						const opts = route.rateLimit;
						const store = route.rateLimit.store;

						const key = opts.key(req);
						if (!key)
							/* istanbul ignore next */
							return;

						const remaining = opts.limit - store.inc(key);
						if (opts.headers) {
							res.setHeader("X-Rate-Limit-Limit", opts.limit);
							res.setHeader("X-Rate-Limit-Remaining", Math.max(0, remaining));
							res.setHeader("X-Rate-Limit-Reset", store.resetTime);
						}
						if (remaining < 0) {
							return this.Promise.reject(new RateLimitExceeded());
						}
					}
				})

				// CORS headers
				.then(() => {
					if (route.cors) {
						if (req.method == "OPTIONS" && req.headers["access-control-request-method"]) {
							// Preflight request
							this.writeCorsHeaders(route, req, res, true);

							// 204 - No content
							res.writeHead(204, {
								"Content-Length": "0"
							});
							res.end();

							// Break the chain
							return Promise.reject();
						}

						// Set CORS headers to `res`
						this.writeCorsHeaders(route, req, res, true);
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
					const body = _.isObject(req.body) ? req.body : {};
					params = Object.assign({}, body, params);
				})

				// Resolve action by name
				.then(() => {
					endpoint = this.broker.findNextActionEndpoint(actionName);
					if (endpoint instanceof Error)
						return this.Promise.reject(endpoint);

					if (endpoint.action.publish === false) {
						// Action is not publishable
						return this.Promise.reject(new ServiceNotFoundError(actionName));
					}

					// Validate params
					if (this.broker.validator && endpoint.action.params)
						this.broker.validator.validate(params, endpoint.action.params);

					return endpoint;
				})

				// Create a new context for request
				.then(() => {
					this.logger.info(`  Call '${actionName}' action`);
					if (this.settings.logRequestParams && this.settings.logRequestParams in this.logger)
						this.logger[this.settings.logRequestParams]("  Params:", params);

					const restAction = {
						name: this.name + ".rest"
					};

					// Create a new context to wrap the request
					const ctx = Context.create(this.broker, restAction, this.broker.nodeID, params, route.callOptions || {});
					ctx._metricStart(ctx.metrics);

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

				// Authorization
				.then(ctx => {
					if (route.authorization) {
						return this.authorize(ctx, route, req, res).then(() => {
							return ctx;
						});
					}
					return ctx;
				})

				// Call the action
				.then(ctx => {
					return ctx.call(endpoint, params, route.callOptions || {})
						.then(data => {
							res.statusCode = 200;

							// Override responseType by action
							const responseType = endpoint.action.responseType;

							// Return with the response
							if (ctx.requestID)
								res.setHeader("X-Request-ID", ctx.requestID);
							//if (ctx.cachedResult)
							//	res.setHeader("X-From-Cache", "true");

							return Promise.resolve()
							// onAfterCall handling
								.then(() => {
									if (route.onAfterCall)
										return route.onAfterCall.call(this, ctx, route, req, res, data);
								})
								.then(() => {
									this.sendResponse(ctx, route, req, res, data, responseType);

									ctx._metricFinish(null, ctx.metrics);
								});
						});
				})

				// Error handling
				.catch(err => {
					if (!err)
						return;

					if (err.ctx)
						res.setHeader("X-Request-ID", err.ctx.id);

					this.logger.error("  Request error!", err.name, ":", err.message, "\n", err.stack, "\nData:", err.data);

					// Return with the error
					this.sendError(res, err);

					// Finish the context
					if (err.ctx)
						err.ctx._metricFinish(null, err.ctx.metrics);
				});

			return p;
		},

		/**
		 * Convert data & send back to client
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {HttpIncomingRequest} req
		 * @param {HttpResponse} res
		 * @param {any} data
		 * @param {String|null} responseType
		 */
		sendResponse(ctx, route, req, res, data, responseType) {
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
				res.setHeader("Content-Type", responseType || "application/json; charset=utf-8");
				res.end(JSON.stringify(data));
			}
			// Other
			else {
				if (!responseType) {
					res.setHeader("Content-Type", "application/json; charset=utf-8");
					res.end(JSON.stringify(data));
				} else {
					res.setHeader("Content-Type", responseType);
					if (_.isString(data))
						res.end(data);
					else
						res.end(data.toString());
				}
			}

			if (this.settings.logResponseData && this.settings.logResponseData in this.logger) {
				this.logger[this.settings.logResponseData](`  Response for '${ctx.action.name}' action`);
				this.logger[this.settings.logResponseData]("  Data:", data);
			}
		},

		/**
		 * Write CORS header
		 *
		 * @param {Object} route
		 * @param {HttpIncomingRequest} req
		 * @param {HttpResponse} res
		 * @param {Boolean} isPreFlight
		 */
		writeCorsHeaders(route, req, res, isPreFlight) {
			if (!route.cors) return;

			// Access-Control-Allow-Origin
			if (!route.cors.origin || route.cors.origin === "*") {
				res.setHeader("Access-Control-Allow-Origin", "*");
			} else if (_.isString(route.cors.origin)) {
				res.setHeader("Access-Control-Allow-Origin", route.cors.origin);
				res.setHeader("Vary", "Origin");
			} else if (Array.isArray(route.cors.origin)) {
				res.setHeader("Access-Control-Allow-Origin", route.cors.origin.join(", "));
				res.setHeader("Vary", "Origin");
			}

			// Access-Control-Allow-Credentials
			if (route.cors.credentials === true) {
				res.setHeader("Access-Control-Allow-Credentials", "true");
			}

			// Access-Control-Expose-Headers
			if (_.isString(route.cors.exposedHeaders)) {
				res.setHeader("Access-Control-Expose-Headers", route.cors.exposedHeaders);
			} else if (Array.isArray(route.cors.exposedHeaders)) {
				res.setHeader("Access-Control-Expose-Headers", route.cors.exposedHeaders.join(", "));
			}

			if (isPreFlight) {
				// Access-Control-Allow-Headers
				if (_.isString(route.cors.allowedHeaders)) {
					res.setHeader("Access-Control-Allow-Headers", route.cors.allowedHeaders);
				} else if (Array.isArray(route.cors.allowedHeaders)) {
					res.setHeader("Access-Control-Allow-Headers", route.cors.allowedHeaders.join(", "));
				} else {
					// AllowedHeaders doesn't specified, so we send back from req headers
					const allowedHeaders = req.headers["access-control-request-headers"];
					if (allowedHeaders) {
						res.setHeader("Vary", "Access-Control-Request-Headers");
						res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
					}
				}

				// Access-Control-Allow-Methods
				if (_.isString(route.cors.methods)) {
					res.setHeader("Access-Control-Allow-Methods", route.cors.methods);
				} else if (Array.isArray(route.cors.methods)) {
					res.setHeader("Access-Control-Allow-Methods", route.cors.methods.join(", "));
				}

				// Access-Control-Max-Age
				if (route.cors.maxAge) {
					res.setHeader("Access-Control-Max-Age", route.cors.maxAge.toString());
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
