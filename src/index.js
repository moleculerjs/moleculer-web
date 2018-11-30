/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const http 						= require("http");
const https 					= require("https");
const queryString 				= require("qs");
const chalk						= require("chalk");
const { match, deprecate }		= require("moleculer").Utils;

const _ 						= require("lodash");
const bodyParser 				= require("body-parser");
const serveStatic 				= require("serve-static");
const isReadableStream			= require("isstream").isReadable;
const pathToRegexp 				= require("path-to-regexp");
const Busboy 					= require("busboy");

const { MoleculerError, MoleculerClientError, MoleculerServerError, ServiceNotFoundError } = require("moleculer").Errors;
const { BadRequestError, NotFoundError, ForbiddenError, RateLimitExceeded, ERR_UNABLE_DECODE_PARAM, ERR_ORIGIN_NOT_ALLOWED } = require("./errors");

const MemoryStore				= require("./memory-store");

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
 * Official API Gateway service for Moleculer
 */
module.exports = {

	// Service name
	name: "api",

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
			// TODO: should remove it and add only in `created` if it's empty
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
		logResponseData: null,

		// If set to false, error responses with a status code indicating a client error will not be logged
		log4XXResponses: true,

		// Use HTTP2 server
		http2: false,

		// Optimize route order
		optimizeOrder: true
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		if (!this.settings.middleware) {
			// Create HTTP or HTTPS server (if not running as middleware)
			this.createServer();

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
		this.routes = [];
		if (Array.isArray(this.settings.routes))
			this.settings.routes.forEach(route => this.addRoute(route));

		this.logger.info("API Gateway created!");
	},

	actions: {

		/**
		 * REST request handler
		 */
		rest: {
			visibility: "private",
			handler(ctx) {
				const req = ctx.params.req;
				const res = ctx.params.res;

				// Set pointers to Context
				req.$ctx = ctx;
				res.$ctx = ctx;

				if (ctx.requestID)
					res.setHeader("X-Request-ID", ctx.requestID);

				this.logRequest(req);

				if (!req.originalUrl)
					req.originalUrl = req.url;

				// Split URL & query params
				let parsed = this.parseQueryString(req);
				let url = parsed.url;

				// Trim trailing slash
				if (url.length > 1 && url.endsWith("/"))
					url = url.slice(0, -1);

				req.parsedUrl = url;

				if (!req.query)
					req.query = parsed.query;

				// Skip if no routes
				if (!this.routes || this.routes.length == 0)
					return null;

				// Check the URL
				for(let i = 0; i < this.routes.length; i++) {
					const route = this.routes[i];

					if (url.startsWith(route.path)) {
						// Update URLs for middlewares
						req.baseUrl = route.path;
						req.url = req.originalUrl.substring(route.path.length);
						if (req.url.length == 0 || req.url[0] !== "/")
							req.url = "/" + req.url;

						return this.routeHandler(ctx, route, req, res);
					}
				}

				return null;
			}
		}
	},

	methods: {
		/**
		 * Create HTTP server
		 */
		createServer() {
			/* istanbul ignore next */
			if (this.server) return;

			if (this.settings.https && this.settings.https.key && this.settings.https.cert) {
				this.server = this.settings.http2 ? this.tryLoadHTTP2Lib().createSecureServer(this.settings.https, this.httpHandler) : https.createServer(this.settings.https, this.httpHandler);
				this.isHTTPS = true;
			} else {
				this.server = this.settings.http2 ? this.tryLoadHTTP2Lib().createServer(this.httpHandler) : http.createServer(this.httpHandler);
				this.isHTTPS = false;
			}
		},

		/**
		 * Try to require HTTP2 servers
		 */
		tryLoadHTTP2Lib () {
			/* istanbul ignore next */
			try {
				return require("http2");
			} catch (err) {
				/* istanbul ignore next */
				this.broker.fatal("HTTP2 server is not available. (>= Node 8.8.1)");
			}
		},

		/**
		 * HTTP request handler. It is called from native NodeJS HTTP server.
		 *
		 * @param {HttpRequest} req
		 * @param {HttpResponse} res
		 * @param {Function} next Call next middleware (for Express)
		 * @returns {Promise}
		 */
		httpHandler(req, res, next) {
			// Set pointers to service
			req.$startTime = process.hrtime();
			req.$service = this;
			req.$next = next;

			res.$service = this;
			res.locals = res.locals || {};

			let requestID = req.headers["x-request-id"];
			if (req.headers["x-correlation-id"])
				requestID = req.headers["x-correlation-id"];

			return this.actions.rest({ req, res }, { requestID })
				.then(result => {
					if (result == null) {
						// Not routed.

						// Serve assets static files
						if (this.serve) {
							this.serve(req, res, err => {
								this.logger.debug(err);
								this.send404(req, res);
							});
							return;
						}

						// If not routed and not served static asset, send 404
						this.send404(req, res);
					}
				})
				.catch(err => {
					// don't log client side errors only it's configured
					if (this.settings.log4XXResponses || (err && !_.inRange(err.code, 400, 500))) {
						this.logger.error("   Request error!", err.name, ":", err.message, "\n", err.stack, "\nData:", err.data);
					}
					this.sendError(req, res, err);
				});
		},

		/**
		 * Handle request in the matched route.
		 *
		 * @param {Context} ctx
		 * @param {Route} route
		 * @param {HttpRequest} req
		 * @param {HttpResponse} res
		 */
		routeHandler(ctx, route, req, res) {
			// Pointer to the matched route
			req.$route = route;
			res.$route = route;

			return new this.Promise((resolve, reject) => {
				res.once("finish", () => resolve(true));

				return this.composeThen(req, res, ...route.middlewares)
					.then(() => {
						let params = {};

						// CORS headers
						if (route.cors) {
							// Set CORS headers to `res`
							this.writeCorsHeaders(route, req, res, true);

							// Is it a Preflight request?
							if (req.method == "OPTIONS" && req.headers["access-control-request-method"]) {
								// 204 - No content
								res.writeHead(204, {
									"Content-Length": "0"
								});
								res.end();

								this.logResponse(req, res);
								return true;
							}
						}

						// Merge params
						if (route.opts.mergeParams === false) {
							params = { body: req.body, query: req.query };
						} else {
							const body = _.isObject(req.body) ? req.body : {};
							Object.assign(params, body, req.query);
						}
						req.$params = params;

						// Resolve action name
						let urlPath = req.parsedUrl.slice(route.path.length);
						if (urlPath.startsWith("/"))
							urlPath = urlPath.slice(1);

						urlPath = urlPath.replace(/~/, "$");
						let action = urlPath;

						// Resolve aliases
						if (route.aliases && route.aliases.length > 0) {
							const found = this.resolveAlias(route, urlPath, req.method);
							if (found) {
								const alias = found.alias;
								this.logger.debug(`  Alias: ${req.method} ${urlPath} -> ${alias.action}`);

								if (route.opts.mergeParams === false) {
									params.params = found.params;
								} else {
									Object.assign(params, found.params);
								}

								req.$alias = alias;

								// Alias handler
								return this.aliasHandler(req, res, alias);

							} else if (route.mappingPolicy == MAPPING_POLICY_RESTRICT) {
								// Blocking direct access
								return null;
							}

						} else if (route.mappingPolicy == MAPPING_POLICY_RESTRICT) {
							// Blocking direct access
							return null;
						}

						if (!action)
							return null;

						// Not found alias, call services by action name
						action = action.replace(/\//g, ".");
						if (route.opts.camelCaseNames) {
							action = action.split(".").map(_.camelCase).join(".");
						}

						return this.aliasHandler(req, res, { action, _generated: true }); // To handle #27
					})
					.then(resolve)
					.catch(reject);

			});
		},

		/**
		 * Alias handler. Call action or call custom function
		 * 	- check whitelist
		 * 	- Rate limiter
		 *  - Resolve endpoint
		 *  - onBeforeCall
		 *  - Authentication
		 *  - Authorization
		 *  - Call the action
		 *
		 * @param {HttpRequest} req
		 * @param {HttpResponse} res
		 * @param {Object} alias
		 * @returns
		 */
		aliasHandler(req, res, alias) {
			const route = req.$route;
			const ctx = req.$ctx;

			// Whitelist check
			if (alias.action && route.hasWhitelist) {
				if (!this.checkWhitelist(route, alias.action)) {
					this.logger.debug(`  The '${alias.action}' action is not in the whitelist!`);
					throw new ServiceNotFoundError({ action: alias.action });
				}
			}

			// Rate limiter
			if (route.rateLimit) {
				const opts = route.rateLimit;
				const store = route.rateLimit.store;

				const key = opts.key(req);
				if (key) {
					const remaining = opts.limit - store.inc(key);
					if (opts.headers) {
						res.setHeader("X-Rate-Limit-Limit", opts.limit);
						res.setHeader("X-Rate-Limit-Remaining", Math.max(0, remaining));
						res.setHeader("X-Rate-Limit-Reset", store.resetTime);
					}
					if (remaining < 0) {
						throw new RateLimitExceeded();
					}
				}
			}

			return this.Promise.resolve()
				// Resolve endpoint by action name
				.then(() => {
					if (alias.action) {
						const endpoint = this.broker.findNextActionEndpoint(alias.action);
						if (endpoint instanceof Error) {
							// TODO: #27
							// if (alias._generated && endpoint instanceof ServiceNotFoundError)
							// 	 throw 503 - Service unavailable
							throw endpoint;
						}

						if (endpoint.action.publish === false) {
							deprecate("The 'publish: false' action property has been deprecated. Use 'visibility: public' instead.");
							// Action is not publishable (Deprecated in >=0.13)
							throw new ServiceNotFoundError({ action: alias.action });
						}

						if (endpoint.action.visibility != null && endpoint.action.visibility != "published") {
							// Action can't be published
							throw new ServiceNotFoundError({ action: alias.action });
						}

						req.$endpoint = endpoint;
						req.$action = endpoint.action;
					}
				})

				// onBeforeCall handling
				.then(() => {
					if (route.onBeforeCall)
						return route.onBeforeCall.call(this, ctx, route, req, res);
				})

				// Authentication
				.then(() => {
					if (route.authentication) {
						return this.authenticate(ctx, route, req, res)
							.then(user => {
								if (user) {
									this.logger.debug("Authenticated user", user);
									ctx.meta.user = user;
								} else {
									this.logger.debug("Anonymous user");
									ctx.meta.user = null;
								}
							});
					}
				})

				// Authorization
				.then(() => {
					if (route.authorization)
						return this.authorize(ctx, route, req, res);
				})

				// Call the action or alias
				.then(() => {
					if (_.isFunction(alias.handler)) {
						// Call custom alias handler
						this.logger.info(`   Call custom function in '${alias.method} ${route.path + (route.path.endsWith("/") ? "": "/")}${alias.path}' alias`);
						return new this.Promise((resolve, reject) => {
							alias.handler.call(this, req, res, err => {
								if (err)
									reject(err);
								else
									resolve();
							});
						}).then(() => {
							if (alias.action)
								return this.callAction(route, alias.action, req, res, alias.type == "stream" ? req : req.$params);
							else
								throw new MoleculerServerError("No alias handler", 500, "NO_ALIAS_HANDLER", { alias });
						});

					} else if (alias.action) {
						return this.callAction(route, alias.action, req, res, alias.type == "stream" ? req : req.$params);
					}
				});
		},

		/**
		 * Call an action via broker
		 *
		 * @param {Object} route 		Route options
		 * @param {String} actionName 	Name of action
		 * @param {HttpRequest} req 	Request object
		 * @param {HttpResponse} res 	Response object
		 * @param {Object} params		Incoming params from request
		 * @returns {Promise}
		 */
		callAction(route, actionName, req, res, params) {
			const ctx = req.$ctx;

			return this.Promise.resolve()

				// Logging params
				.then(() => {
					this.logger.info(`   Call '${actionName}' action`);
					if (this.settings.logRequestParams && this.settings.logRequestParams in this.logger)
						this.logger[this.settings.logRequestParams]("   Params:", params);

					// Pass the `req` & `res` vars to ctx.params.
					if (req.$alias && req.$alias.passReqResToParams) {
						params.$req = req;
						params.$res = res;
					}
				})

				// Call the action
				.then(() => ctx.call(req.$endpoint, params, route.callOptions))

				// Post-process the response
				.then(data => {

					// onAfterCall handling
					if (route.onAfterCall)
						return route.onAfterCall.call(this, ctx, route, req, res, data);

					return data;
				})

				// Send back the response
				.then(data => {
					this.sendResponse(req, res, data, req.$endpoint.action);

					this.logResponse(req, res, data);

					return true;
				})

				// Error handling
				.catch(err => {
					/* istanbul ignore next */
					if (!err)
						return;

					throw err;
				});
		},

		/**
		 * Convert data & send back to client
		 *
		 * @param {HttpIncomingMessage} req
		 * @param {HttpResponse} res
		 * @param {any} data
		 * @param {Object?} action
		 */
		sendResponse(req, res, data, action) {
			const ctx = req.$ctx;
			//const route = req.$route;

			/* istanbul ignore next */
			if (res.headersSent) {
				this.logger.warn("Headers have already sent");
				return;
			}

			/* istanbul ignore next */
			if (!res.statusCode)
				res.statusCode = 200;

			// Status code & message
			if (ctx.meta.$statusCode) {
				res.statusCode = ctx.meta.$statusCode;
			}
			if (ctx.meta.$statusMessage) {
				res.statusMessage = ctx.meta.$statusMessage;
			}

			// Redirect
			if (res.statusCode >= 300 && res.statusCode < 400) {
				const location = ctx.meta.$location;
				/* istanbul ignore next */
				if (!location)
					this.logger.warn(`The 'ctx.meta.$location' is missing for status code ${res.statusCode}!`);
				else
					res.setHeader("Location", location);
			}

			// Override responseType by action (Deprecated)
			let responseType;
			/* istanbul ignore next */
			if (action && action.responseType) {
				deprecate("The 'responseType' action property has been deprecated. Use 'ctx.meta.$responseType' instead");
				responseType = action.responseType;
			}

			// Custom headers (Deprecated)
			/* istanbul ignore next */
			if (action && action.responseHeaders) {
				deprecate("The 'responseHeaders' action property has been deprecated. Use 'ctx.meta.$responseHeaders' instead");
				Object.keys(action.responseHeaders).forEach(key => {
					res.setHeader(key, action.responseHeaders[key]);
					if (key == "Content-Type" && !responseType)
						responseType = action.responseHeaders[key];
				});
			}

			// Custom responseType from ctx.meta
			if (ctx.meta.$responseType) {
				responseType = ctx.meta.$responseType;
			}

			// Custom headers from ctx.meta
			if (ctx.meta.$responseHeaders) {
				Object.keys(ctx.meta.$responseHeaders).forEach(key => {
					if (key == "Content-Type" && !responseType)
						responseType = ctx.meta.$responseHeaders[key];
					else
						res.setHeader(key, ctx.meta.$responseHeaders[key]);
				});
			}

			if (data == null)
				return res.end();

			// Buffer
			if (Buffer.isBuffer(data)) {
				res.setHeader("Content-Type", responseType || "application/octet-stream");
				res.setHeader("Content-Length", data.length);
				res.end(data);
			}
			// Buffer from Object
			else if (_.isObject(data) && data.type == "Buffer") {
				const buf = Buffer.from(data);
				res.setHeader("Content-Type", responseType || "application/octet-stream");
				res.setHeader("Content-Length", buf.length);
				res.end(buf);
			}
			// Stream
			else if (isReadableStream(data)) {
				res.setHeader("Content-Type", responseType || "application/octet-stream");
				data.pipe(res);
			}
			// Object or Array (stringify)
			else if (_.isObject(data) || Array.isArray(data)) {
				res.setHeader("Content-Type", responseType || "application/json; charset=utf-8");
				res.end(JSON.stringify(data));
			}
			// Other (stringify or raw text)
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
		},

		/**
		 * Middleware for ExpressJS
		 *
		 * @returns {Function}
		 */
		express() {
			return (req, res, next) => this.httpHandler(req, res, next);
		},

		/**
		 * Compose middlewares
		 *
		 * @param {...Function} mws
		 */
		compose(...mws) {
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
		},

		/**
		 * Compose middlewares and return Promise
		 * @param {...Function} mws
		 * @returns {Promise}
		 */
		composeThen(req, res, ...mws) {
			return new this.Promise((resolve, reject) => {
				this.compose(...mws)(req, res, err => {
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
		},

		/**
		 * Send 404 response
		 *
		 * @param {HttpResponse} res
		 */
		send404(req, res) {
			if (req.$next)
				return req.$next();

			this.sendError(req, res, new NotFoundError());
		},

		/**
		 * Send an error response
		 *
		 * @param {HttpResponse} res
		 * @param {Error} err
		 */
		sendError(req, res, err) {
			// Route error handler
			if (req.$route && _.isFunction(req.$route.onError))
				return req.$route.onError.call(this, req, res, err);

			// Global error handler
			if (_.isFunction(this.settings.onError))
				return this.settings.onError.call(this, req, res, err);

			// --- Default error handler

			// In middleware mode call the next(err)
			if (req.$next)
				return req.$next(err);

			/* istanbul ignore next */
			if (res.headersSent) {
				this.logger.warn("Headers have already sent", req.url, err);
				return;
			}

			/* istanbul ignore next */
			if (!err || !(err instanceof Error)) {
				res.writeHead(500);
				res.end("Internal Server Error");

				this.logResponse(req, res);
				return;
			}

			/* istanbul ignore next */
			if (!(err instanceof MoleculerError)) {
				const e = err;
				err = new MoleculerError(e.message, e.code || e.status, e.type, e.data);
				err.name = e.name;
			}

			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");

			const code = _.isNumber(err.code) ? err.code : 500;
			res.writeHead(code);
			const errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
			res.end(JSON.stringify(errObj, null, 2));

			this.logResponse(req, res);
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
				"Location": url,
				"Content-Length": "0"
			});
			res.end();
			//this.logResponse(req, res);
		},

		/**
		 * Split the URL and resolve vars from querystring
		 *
		 * @param {any} req
		 * @returns
		 */
		parseQueryString(req) {
			// Split URL & query params
			let url = req.url;
			let query = {};
			const questionIdx = req.url.indexOf("?", 1);
			if (questionIdx !== -1) {
				query = queryString.parse(req.url.substring(questionIdx + 1));
				url = req.url.substring(0, questionIdx);
			}
			return {query, url};
		},

		/**
		 * Log the request
		 *
		 * @param {HttpIncomingMessage} req
		 */
		logRequest(req) {
			this.logger.info(`=> ${req.method} ${req.url}`);
		},

		/**
		 * Return with colored status code
		 *
		 * @param {any} code
		 * @returns
		 */
		coloringStatusCode(code) {
			if (code >= 500)
				return chalk.red.bold(code);
			if (code >= 400 && code < 500)
				return chalk.red.bold(code);
			if (code >= 300 && code < 400)
				return chalk.cyan.bold(code);
			if (code >= 200 && code < 300)
				return chalk.green.bold(code);

			/* istanbul ignore next */
			return code;
		},

		/**
		 * Log the response
		 *
		 * @param {HttpIncomingMessage} req
		 * @param {HttpResponse} res
		 * @param {any} data
		 */
		logResponse(req, res, data) {
			let time = "";
			if (req.$startTime) {
				const diff = process.hrtime(req.$startTime);
				const duration = (diff[0] + diff[1] / 1e9) * 1000;
				if (duration > 1000)
					time = chalk.red(`[+${Number(duration / 1000).toFixed(3)} s]`);
				else
					time = chalk.grey(`[+${Number(duration).toFixed(3)} ms]`);
			}
			this.logger.info(`<= ${this.coloringStatusCode(res.statusCode)} ${req.method} ${chalk.bold(req.url)} ${time}`);

			/* istanbul ignore next */
			if (this.settings.logResponseData && this.settings.logResponseData in this.logger) {
				this.logger[this.settings.logResponseData]("  Data:", data);
			}
			this.logger.info("");
		},

		/**
		 * Check origin(s)
		 *
		 * @param {String} origin
		 * @param {String|Array<String>} settings
		 * @returns {Boolean}
		 */
		checkOrigin(origin, settings) {
			if (_.isString(settings)) {
				if (settings.indexOf(origin) !== -1)
					return true;

				if (settings.indexOf("*") !== -1) {
					// Based on: https://github.com/hapijs/hapi
					const wildcard = new RegExp(`^${_.escapeRegExp(settings).replace(/\\\*/g, ".*").replace(/\\\?/g, ".")}$`);
					return origin.match(wildcard);
				}
			} else if (Array.isArray(settings)) {
				for(let i = 0; i < settings.length; i++) {
					if (this.checkOrigin(origin, settings[i])) {
						return true;
					}
				}
			}

			return false;
		},

		/**
		 * Write CORS header
		 *
		 * Based on: https://github.com/expressjs/cors
		 *
		 * @param {Object} route
		 * @param {HttpIncomingMessage} req
		 * @param {HttpResponse} res
		 * @param {Boolean} isPreFlight
		 */
		writeCorsHeaders(route, req, res, isPreFlight) {

			/* istanbul ignore next */
			if (!route.cors) return;

			const origin = req.headers["origin"];
			// It's not presented, when it's a local request (origin and target same)
			if (!origin)
				return;

			// Access-Control-Allow-Origin
			if (!route.cors.origin || route.cors.origin === "*") {
				res.setHeader("Access-Control-Allow-Origin", "*");
			} else if (this.checkOrigin(origin, route.cors.origin)) {
				res.setHeader("Access-Control-Allow-Origin", origin);
				res.setHeader("Vary", "Origin");
			} else {
				throw new ForbiddenError(ERR_ORIGIN_NOT_ALLOWED);
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
			// Rewrite to for iterator (faster)
			return route.whitelist.find(mask => {
				if (_.isString(mask))
					return match(action, mask);
				else if (_.isRegExp(mask))
					return mask.test(action);
			}) != null;
		},

		/**
		 * Resolve alias names
		 *
		 * @param {Object} route
		 * @param {String} url
		 * @param {string} [method="GET"]
		 * @returns {Object} Resolved alas & params
		 */
		resolveAlias(route, url, method = "GET") {
			for(let i = 0; i < route.aliases.length; i++) {
				const alias = route.aliases[i];
				if (alias.method === "*" || alias.method === method) {
					const params = alias.match(url);
					if (params) {
						return { alias, params };
					}
				}
			}
			return false;
		},

		/**
		 * Add & prepare route from options
		 * @param {Object} opts
		 * @param {Boolean} [toBottom=true]
		 */
		addRoute(opts, toBottom = true) {
			const route = this.createRoute(opts);
			const idx = this.routes.findIndex(r => r.path == route.path);
			if (idx !== -1) {
				// Replace the previous
				this.routes[idx] = route;
			} else {
				// Add new route
				if (toBottom)
					this.routes.push(route);
				else
					this.routes.unshift(route);

				// Reordering routes
				if (this.settings.optimizeOrder)
					this.optimizeRouteOrder();
			}

			return route;
		},

		/**
		 * Remove a route by path
		 * @param {String} path
		 */
		removeRoute(path) {
			const idx = this.routes.findIndex(r => r.opts.path == path);
			if (idx !== -1)
				this.routes.splice(idx, 1);
		},

		/**
		 * Optimize route order by route path depth
		 */
		optimizeRouteOrder() {
			this.routes.sort((a,b) => addSlashes(b.path).split("/").length - addSlashes(a.path).split("/").length);
			this.logger.info("Optimized path order: ", this.routes.map(r => r.path));
		},

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
					this.logger.warn("Define 'authorize' method in the service to enable authorization.");
					route.authorization = false;
				} else
					route.authorization = true;
			}
			if (opts.authentication) {
				if (!_.isFunction(this.authenticate)) {
					this.logger.warn("Define 'authenticate' method in the service to enable authentication.");
					route.authentication = false;
				} else
					route.authentication = true;
			}

			// Call options
			route.callOptions = opts.callOptions;

			// Create body parsers as middlewares
			if (opts.bodyParsers) {
				const bps = opts.bodyParsers;
				Object.keys(bps).forEach(key => {
					const opts = _.isObject(bps[key]) ? bps[key] : undefined;
					if (bps[key] !== false && key in bodyParser)
						route.middlewares.push(bodyParser[key](opts));
				});
			}

			// Middlewares
			let mw = [];
			if (this.settings.use && Array.isArray(this.settings.use) && this.settings.use.length > 0)
				mw.push(...this.settings.use);

			if (opts.use && Array.isArray(opts.use) && opts.use.length > 0)
				mw.push(...opts.use);

			if (mw.length > 0) {
				route.middlewares.push(...mw);
				this.logger.info(`  Registered ${mw.length} middlewares.`);
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

			// `onBeforeCall` handler
			if (opts.onBeforeCall)
				route.onBeforeCall = this.Promise.method(opts.onBeforeCall);

			// `onAfterCall` handler
			if (opts.onAfterCall)
				route.onAfterCall = this.Promise.method(opts.onAfterCall);

			// `onError` handler
			if (opts.onError)
				route.onError = opts.onError;

			// Create URL prefix
			const globalPath = this.settings.path && this.settings.path != "/" ? this.settings.path : "";
			route.path = addSlashes(globalPath) + (opts.path || "");
			route.path = normalizePath(route.path);

			// Create aliases
			this.createRouteAliases(route, opts.aliases);

			// Set alias mapping policy
			route.mappingPolicy = opts.mappingPolicy || MAPPING_POLICY_ALL;

			return route;
		},

		/**
		 * Create all aliases for route.
		 * @param {Object} route
		 * @param {Object} aliases
		 */
		createRouteAliases(route, aliases) {
			route.aliases = [];
			_.forIn(aliases, (action, matchPath) => {
				if (matchPath.startsWith("REST ")) {
					const p = matchPath.split(/\s+/);
					const pathName = p[1];

					// Generate RESTful API. More info http://www.restapitutorial.com/
					route.aliases.push(
						this.createAlias(route, `GET ${pathName}`, 			`${action}.list`),
						this.createAlias(route, `GET ${pathName}/:id`, 		`${action}.get`),
						this.createAlias(route, `POST ${pathName}`, 		`${action}.create`),
						this.createAlias(route, `PUT ${pathName}/:id`, 		`${action}.update`),
						this.createAlias(route, `PATCH ${pathName}/:id`, 	`${action}.patch`),
						this.createAlias(route, `DELETE ${pathName}/:id`, 	`${action}.remove`)
					);
				} else {
					route.aliases.push(this.createAlias(route, matchPath, action));
				}
			});

			if (route.opts.autoAliases) {
				this.regenerateAutoAliases(route);
			}


			return route.aliases;
		},

		/**
		 * Regenerate aliases automatically if service registry has been changed.
		 *
		 * @param {Route} route
		 */
		regenerateAutoAliases(route) {
			this.logger.info(`♻ Generate aliases for '${route.path}' route...`);

			route.aliases = route.aliases.filter(alias => !alias._generated);

			const processedServices = new Set();

			const services = this.broker.registry.getServiceList({ withActions: true });
			services.forEach(service => {
				const serviceName = service.version ? `v${service.version}.${service.name}` : service.name;
				const basePath = addSlashes(_.isString(service.settings.rest) ? service.settings.rest : serviceName.replace(/\./g, "/"));

				// Skip multiple instances of services
				if (processedServices.has(serviceName)) return;

				_.forIn(service.actions, action => {
					if (action.rest) {
						let alias = null;

						// Check visibility
						if (action.visibility != null && action.visibility != "published") return;

						// Check whitelist
						if (route.hasWhitelist && !this.checkWhitelist(route, action.name)) return;

						if (_.isString(action.rest)) {
							if (action.rest.indexOf(" ") !== -1) {
								// Handle route: "POST /import"
								const p = action.rest.split(/\s+/);
								alias = {
									method: p[0],
									path: basePath + p[1]
								};
							} else {
								// Handle route: "/import". In this case apply to all methods as "* /import"
								alias = {
									method: "*",
									path: basePath + action.rest
								};
							}
						} else if (action.rest === true) {
							// "route: true" is converted to "* {baseName}/{action.rawName}"
							alias = {
								method: "*",
								path: basePath + action.rawName
							};
						} else if (_.isObject(action.rest)) {
							// Handle route: { method: "POST", route: "/other" }
							alias = Object.assign({}, action.rest, {
								method: action.rest.method || "*",
								path: basePath + action.rest.path ? action.rest.path : action.rawName
							});
						}

						if (alias) {
							alias.path = removeTrailingSlashes(normalizePath(alias.path));
							alias._generated = true;
							route.aliases.push(this.createAlias(route, alias, action.name));
						}
					}

					processedServices.add(serviceName);
				});

			});

			/* istanbul ignore next */
			if (route.aliases.length == 0) {
				this.logger.info("  No aliases for this route.");
			}
			this.logger.info("");
		},

		/**
		 * Create alias for route.
		 *
		 * @param {Object} route
		 * @param {String|Object} matchPath
		 * @param {String|Object} action
		 */
		createAlias(route, path, action) {
			let alias = {};

			// Parse path
			if (_.isString(path)) {
				if (path.indexOf(" ") !== -1) {
					const p = path.split(/\s+/);
					alias.method = p[0];
					alias.path = p[1];
				} else {
					alias.method = "*";
					alias.path = path;
				}

			} else if (_.isObject(path)) {
				alias = _.cloneDeep(path);
			}

			if (_.isString(action)) {
				// Parse type from action name
				if (action.indexOf(":") > 0) {
					const p = action.split(":");
					alias.type = p[0];
					alias.action = p[1];
				} else {
					alias.action = action;
				}
			} else if (_.isFunction(action)) {
				alias.handler = action;
			} else if (Array.isArray(action)) {
				const mws = _.compact(action.map(mw => {
					if (_.isString(mw))
						alias.action = mw;
					else if(_.isFunction(mw))
						return mw;
				}));
				alias.handler = this.compose(...mws);

			} else if (action != null) {
				alias = Object.assign(alias, action);
			}

			alias.type = alias.type || "call";

			if (alias.path.startsWith("/"))
				alias.path = alias.path.slice(1);

			let keys = [];
			alias.re = pathToRegexp(alias.path, keys, {}); // Options: https://github.com/pillarjs/path-to-regexp#usage

			this.logger.info(`  Alias: ${alias.method} ${route.path + (route.path.endsWith("/") ? "": "/")}${alias.path} -> ${alias.handler != null ? "<Function>" : alias.action}`);

			alias.match = url => {
				const m = alias.re.exec(url);
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
			};

			if (alias.type == "multipart") {
				// Handle file upload in multipart form
				alias.handler = (req, res) => {
					const ctx = req.$ctx;
					const promises = [];

					const busboy = new Busboy(_.defaultsDeep({ headers: req.headers }, alias.busboyConfig, route.opts.busboyConfig));
					busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
						promises.push(ctx.call(alias.action, file, _.defaultsDeep({}, route.opts.callOptions, { meta: {
							fieldname: fieldname,
							filename: filename,
							encoding: encoding,
							mimetype: mimetype,
						}})));
					});

					busboy.on("finish", () => {
						/* istanbul ignore next */
						if (!promises.length)
							return this.sendError(req, res, new MoleculerClientError("File missing in the request"));

						this.Promise.all(promises).then(data => {
							if (route.onAfterCall)
								return route.onAfterCall.call(this, ctx, route, req, res, data);
							return data;

						}).then(data => {
							this.sendResponse(req, res, data, {});

						}).catch(err => {
							/* istanbul ignore next */
							this.sendError(req, res, err);
						});
					});

					busboy.on("error", err => {
						/* istanbul ignore next */
						this.sendError(req, res, err);
					});

					req.pipe(busboy);

				};
			}

			return alias;
		},

		// Regenerate all auto aliases routes
		regenerateAllAutoAliases: _.debounce(function() {
			/* istanbul ignore next */
			this.routes.forEach(route => route.opts.autoAliases && this.regenerateAutoAliases(route));
		}, 500)
	},


	events: {
		"$services.changed"() {
			this.regenerateAllAutoAliases();
		}
	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {
		if (this.settings.middleware)
			return;

		/* istanbul ignore next */
		return new this.Promise((resolve, reject) => {
			this.server.listen(this.settings.port, this.settings.ip, err => {
				if (err)
					return reject(err);

				const addr = this.server.address();
				this.logger.info(`API Gateway listening on ${this.isHTTPS ? "https" : "http"}://${addr.address}:${addr.port}`);
				resolve();
			});
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
			return new this.Promise((resolve, reject) => {
				this.server.close(err => {
					if (err)
						return reject(err);

					this.logger.info("API Gateway stopped!");
					resolve();
				});
			});
		}
	},

	bodyParser,
	serveStatic,

	Errors: require("./errors"),
};
