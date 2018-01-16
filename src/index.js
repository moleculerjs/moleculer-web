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
const isReadableStream	= require("isstream").isReadable;
const pathToRegexp 		= require("path-to-regexp");

const { Context } 		= require("moleculer");
const { MoleculerError, MoleculerServerError, ServiceNotFoundError } = require("moleculer").Errors;
const { BadRequestError, RateLimitExceeded, ERR_UNABLE_DECODE_PARAM } = require("./errors");

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
		logResponseData: null,

		// Pre-validation
		preValidate: true
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
		 * Compose middlewares
		 *
		 * @param {...Function} mws
		 */
		compose(...mws) {
			return (req, res, done) => {
				const next = (i, err) => {
					if (i >= mws.length || err) {
						if (_.isFunction(done))
							return done.call(this, err);
						return;
					}

					mws[i].call(this, req, res, err => next(i + 1, err));
				};

				return next(0);
			};
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
					this.logger.warn("Please define 'authorize' method in the service to authorization.");
					route.authorization = false;
				} else
					route.authorization = true;
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
			route.path = (this.settings.path || "") + (opts.path || "");
			route.path = route.path || "/";

			// Helper for aliased routes
			const createAlias = (matchPath, action) => {
				let method = "*";
				if (matchPath.indexOf(" ") !== -1) {
					const p = matchPath.split(" ");
					method = p[0];
					matchPath = p[1];
				}
				if (matchPath.startsWith("/"))
					matchPath = matchPath.slice(1);

				let alias;
				if (_.isString(action))
					alias = { action };
				else if (_.isFunction(action))
					alias = { handler: action };
				else if (Array.isArray(action)) {
					let mws = action.map(mw => {
						if (_.isString(mw))
							return (req, res) => this.preActionCall(route, req, res, mw);
						else if(_.isFunction(mw))
							return mw;
					});
					alias = { handler: this.compose(...mws) };
				} else {
					alias = action;
				}

				alias.path = matchPath;
				alias.method = method;

				let keys = [];
				alias.re = pathToRegexp(matchPath, keys, {}); // Options: https://github.com/pillarjs/path-to-regexp#usage

				this.logger.info(`  Alias: ${method} ${route.path + (route.path.endsWith("/") ? "": "/")}${matchPath} -> ${alias.handler != null ? "<Function>" : alias.action}`);

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

				return alias;
			};

			// Handle aliases
			if (opts.aliases && Object.keys(opts.aliases).length > 0) {
				route.aliases = [];
				_.forIn(opts.aliases, (action, matchPath) => {
					if (matchPath.startsWith("REST ")) {
						const p = matchPath.split(" ");
						const pathName = p[1];

						// Generate RESTful API. More info http://www.restapitutorial.com/
						route.aliases.push(createAlias(`GET ${pathName}`, 			`${action}.list`));
						route.aliases.push(createAlias(`GET ${pathName}/:id`, 		`${action}.get`));
						route.aliases.push(createAlias(`POST ${pathName}`, 			`${action}.create`));
						route.aliases.push(createAlias(`PUT ${pathName}/:id`, 		`${action}.update`));
						//route.aliases.push(createAlias(`PATCH ${pathName}/:id`, 	`${action}.update`));
						route.aliases.push(createAlias(`DELETE ${pathName}/:id`, 	`${action}.remove`));

					} else {
						route.aliases.push(createAlias(matchPath, action));
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
		 */
		send404(req, res) {
			if (req.$next)
				return req.$next();

			this.sendError(req, res, new MoleculerError("Not found", 404));
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

			if (!err || !(err instanceof Error)) {
				res.writeHead(500);
				res.end("Internal Server Error");

				this.logResponse(req, res);
				return;
			}

			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");

			const code = _.isNumber(err.code) ? err.code : 500;
			res.writeHead(code);
			const errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
			res.end(JSON.stringify(errObj, null, 2));

			this.logResponse(req, res, err? err.ctx : null);
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
		 * HTTP request handler
		 *
		 * @param {HttpRequest} req
		 * @param {HttpResponse} res
		 * @param {Function} next Call next middleware (for Express)
		 * @returns
		 */
		httpHandler(req, res, next) {
			req.$service = this; // pointer to this service
			res.$service = this; // pointer to this service
			req.$next = next;

			res.locals = res.locals || {};
			this.logRequest(req);

			try {
				// Split URL & query params
				let parsed = this.parseQueryString(req);
				let url = parsed.url;
				if (!req.query)
					req.query = parsed.query;

				let params = {};

				// Trim trailing slash
				if (url.length > 1 && url.endsWith("/"))
					url = url.slice(0, -1);

				// Check the URL
				if (this.routes && this.routes.length > 0) {
					for(let i = 0; i < this.routes.length; i++) {
						const route = this.routes[i];

						if (url.startsWith(route.path)) {

							// Pointer to the matched route
							req.$route = route;
							res.$route = route;

							// Call middlewares
							this.compose(...route.middlewares)(req, res, err => {
								if (err) {
									const error = new MoleculerError(err.message, err.status, err.type);
									this.logger.error("Middleware error!", error);
									return this.sendError(req, res, error);
								}

								// CORS headers
								if (route.cors) {
									if (req.method == "OPTIONS" && req.headers["access-control-request-method"]) {
										// Preflight request
										this.writeCorsHeaders(route, req, res, true);

										// 204 - No content
										res.writeHead(204, {
											"Content-Length": "0"
										});
										res.end();

										this.logResponse(req, res);
										return;
									}

									// Set CORS headers to `res`
									this.writeCorsHeaders(route, req, res, true);
								}

								// Merge params
								const body = _.isObject(req.body) ? req.body : {};
								Object.assign(params, body, req.query);
								req.$params = params;

								// Resolve action name
								let urlPath = url.slice(route.path.length);
								if (urlPath.startsWith("/"))
									urlPath = urlPath.slice(1);

								urlPath = urlPath.replace(/~/, "$");
								let actionName = urlPath;

								// Resolve aliases
								if (route.aliases && route.aliases.length > 0) {
									const found = this.resolveAlias(route, urlPath, req.method);
									if (found) {
										let alias = found.alias;
										this.logger.debug(`  Alias: ${req.method} ${urlPath} -> ${alias.action}`);
										Object.assign(params, found.params);

										req.$alias = alias;

										// Custom Action handler
										if (alias.handler) {
											return alias.handler.call(this, req, res, err => {
												if (err) {
													const error = new MoleculerError(err.message, err.status, err.type);
													this.logger.error("Alias middleware error!", error);
													return this.sendError(req, res, error);
												}

												if (req.$next)
													return req.$next();

												// If it is reached, there is no real handler for this alias.
												const error = new MoleculerServerError("No alias handler", 500);
												this.logger.error(error);
												return this.sendError(req, res, error);
											});
										}

										actionName = alias.action;

									} else if (route.mappingPolicy == MAPPING_POLICY_RESTRICT) {
										// Blocking direct access
										return this.send404(req, res);
									}

								} else if (route.mappingPolicy == MAPPING_POLICY_RESTRICT) {
									// Blocking direct access
									return this.send404(req, res);
								}

								actionName = actionName.replace(/\//g, ".");

								if (route.opts.camelCaseNames) {
									actionName = actionName.split(".").map(_.camelCase).join(".");
								}

								this.preActionCall(route, req, res, actionName);
							});

							return;
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

				// If no route, send 404
				this.send404(req, res);

			} catch(err) {
				this.logger.error("Handler error!", err);
				return this.sendError(req, res, err);
			}
		},

		/**
		 * Route handler.
		 * 	- check whitelist
		 * 	- CORS
		 * 	- Rate limiter
		 *
		 * @param {Object} route
		 * @param {HttpRequest} req
		 * @param {HttpResponse} res
		 * @param {String} actionName
		 * @returns
		 */
		preActionCall(route, req, res, actionName) {

			// Whitelist check
			if (route.hasWhitelist) {
				if (!this.checkWhitelist(route, actionName)) {
					this.logger.debug(`  The '${actionName}' action is not in the whitelist!`);
					return this.sendError(req, res, new ServiceNotFoundError(actionName));
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
						return this.sendError(req, res, new RateLimitExceeded());
					}
				}
			}

			// Call the action
			return this.callAction(route, actionName, req, res, req.$params);
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
			let reqContext;

			const p = this.Promise.resolve()
				// Create a new context for request
				// should be the first thing for accurate metrics
				.then(() => {
					const vName = this.version
						? `${this.version}.${this.name}`
						: this.name; //version.api. or api.

					const method = `${req.method.toLowerCase()}\t${actionName
						.split(".")
						.join("/")}`; //httpmethod version/service/method

					const restAction = {
						name: vName + "." + method //"api.post v1/example.add"
					};

					// Create a new context to wrap the request
					reqContext = Context.create(this.broker, restAction, this.broker.nodeID, params, route.callOptions || {});
					reqContext._metricStart(reqContext.metrics);

					return reqContext;
				})
				// endpoint & params validation
				.then(ctx => {

					endpoint = this.broker.findNextActionEndpoint(actionName);

					if (endpoint instanceof Error) throw endpoint; //to catch handler

					if (endpoint.action.publish === false) {
						// Action is not publishable

						throw new ServiceNotFoundError(actionName); //to handle by catch
					}

					// Validate params
					if (this.settings.preValidate && this.broker.validator && endpoint.action.params)
						this.broker.validator.validate(params, endpoint.action.params); //this throw ValidationError

					//all good
					req.$endpoint = endpoint;

					return ctx;
				})
				//refereces & logging, verbose option?
				.then(ctx => {
					//if(!this.settings.verbose) return ctx; //continue along
					//
					this.logger.info(`  Call '${actionName}' action`);
					if (this.settings.logRequestParams && this.settings.logRequestParams in this.logger) {
						this.logger[this.settings.logRequestParams]("  Params:", params);
					}
					// Pass the `req` & `res` vars to ctx.params.
					if (req.$alias && req.$alias.passReqResToParams) {
						if (endpoint.local) {
							params.$req = req;
							params.$res = res;
						} else {
							this.logger.warn("Don't use the `passReqResToParams` option in aliases if you call a remote service.");
						}
					}

					return ctx;
				})
				// onBeforeCall handling
				.then(ctx => {
					if (route.onBeforeCall)
						return route.onBeforeCall.call(this, ctx, route, req, res).then(() => ctx);

					return ctx;
				})
				// Authorization
				.then(ctx => {
					if (route.authorization)
						return this.authorize(ctx, route, req, res).then(() => ctx);

					return ctx;
				})
				// Call the action
				.then(ctx => {
					return ctx.call(endpoint, params, route.callOptions || {})
						.then(data => {
							res.statusCode = 200;

							// Return with the response
							if (ctx.requestID)
								res.setHeader("X-Request-ID", ctx.requestID);
							//if (ctx.cachedResult)
							//  res.setHeader("X-From-Cache", "true");

							return (
								Promise.resolve()
									// onAfterCall handling
									.then(() => {
										if (route.onAfterCall)
											return route.onAfterCall.call(this, ctx, route, req, res, data);
									})
									.then(() => {

										this.sendResponse(ctx, route, req, res, data, endpoint.action);
										//finish success
										ctx._metricFinish(null, ctx.metrics);

										this.logResponse(req, res, ctx, data);
									})
							);
						});
				})
				// Error handling
				.catch(err => {
					this.logger.error("  Request error!", err.name, ":", err.message, "\n", err.stack, "\nData:", err.data);

					if (reqContext) {
						res.setHeader("X-Request-ID", reqContext.requestID);

						// Finish the context with error
						reqContext._metricFinish(err, reqContext.metrics);
					}

					// Return with the error
					this.sendError(req, res, err);
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
		sendResponse(ctx, route, req, res, data, action) {
			if (data == null)
				return res.end();

			// Override responseType by action
			let responseType = action.responseType;

			// Custom headers
			if (action.responseHeaders) {
				Object.keys(action.responseHeaders).forEach(key => {
					res.setHeader(key, action.responseHeaders[key]);
					if (key == "Content-Type" && !responseType)
						responseType = action.responseHeaders[key];
				});
			}

			// Buffer
			if (Buffer.isBuffer(data)) {
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
			else if (isReadableStream(data)) {
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
		},

		/**
		 * Log the request
		 *
		 * @param {HttpIncomingRequest} req
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
				return code;
			if (code >= 400 && code < 500)
				return code;
			if (code >= 300 && code < 400)
				return code;
			if (code >= 200 && code < 300)
				return code;
			return code;
		},

		/**
		 * Log the response
		 *
		 * @param {HttpIncomingRequest} req
		 * @param {HttpResponse} res
		 * @param {Context} ctx
		 * @param {any} data
		 */
		logResponse(req, res, ctx, data) {
			let time = "";
			if (ctx && ctx.duration) {
				if (ctx.duration > 1000)
					time = `[+${Number(ctx.duration / 1000).toFixed(3)} s]`;
				else
					time = `[+${Number(ctx.duration).toFixed(3)} ms]`;
			}
			this.logger.info(`<= ${this.coloringStatusCode(res.statusCode)} ${req.method} ${req.url} ${time}`);

			if (this.settings.logResponseData && this.settings.logResponseData in this.logger) {
				this.logger[this.settings.logResponseData]("  Data:", data);
			}
			this.logger.info("");
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
							alias,
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
	},


	bodyParser,
	serveStatic,

	Errors: require("./errors"),
};