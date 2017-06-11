"use strict";

/**
 * This example uses all features of API Gateway:
 *  - SSL
 * 	- server assets
 *  - Multi routes
 *  - role-based authorization with JWT
 *  - whitelist
 *  - alias
 *  - body-parsers
 *  - file upload
 * 
 * Metrics, statistics, validation features of Moleculer is enabled.
 * 
 * Example:
 * 	
 *  - Open index.html
 * 		https://localhost:4000
 * 	
 *  - Access to assets
 * 		https://localhost:4000/images/logo.png
 * 	
 *  - API: Add two numbers (use alias name)
 * 		https://localhost:4000/api/add?a=25&b=13
 * 
 * 	- or with named parameters
 * 		https://localhost:4000/api/add/25/13
 * 	
 *  - API: Divide two numbers with validation
 * 		https://localhost:4000/api/math/div?a=25&b=13
 * 		https://localhost:4000/api/math/div?a=25      <-- Throw validation error because `b` is missing
 * 
 *  - Authorization:
 * 		https://localhost:4000/api/admin/~node/health  <-- Throw `Unauthorized` because no `Authorization` header	
 * 
 * 		First you have to login . You will get a token and set it to the `Authorization` key in header
 * 			https://localhost:4000/api/login?username=admin&password=admin
 * 
 * 		Set the token to header and try again
 * 			https://localhost:4000/api/admin/~node/health
 * 
 *  - File upload:
 * 		Open https://localhost:4000/upload.html in the browser and upload a file. The file will be placed to the "examples/full/uploads" folder.
 * 
 */

const fs	 				= require("fs");
const path 					= require("path");
const { ServiceBroker } 	= require("moleculer");
const NatsTransporter 		= require("moleculer").Transporters.NATS;
const { MoleculerError } 	= require("moleculer").Errors;
const { ForbiddenError, UnAuthorizedError, ERR_NO_TOKEN, ERR_INVALID_TOKEN } = require("../../src/errors");
const multer  				= require("multer");
const mkdirp  				= require("mkdirp").sync;

// File upload storage with multer
const uploadDir = path.join(__dirname, "./uploads");
const storage = multer.diskStorage({
	destination: (req, file, callback) => {
		callback(null, uploadDir);
	},
	filename: (req, file, callback) => {
		callback(null, file.originalname);
	}
});
const upload = multer({ storage : storage}).single("myfile");
mkdirp(uploadDir);
// ----

const ApiGatewayService = require("../../index");

// Create broker
const broker = new ServiceBroker({
	transporter: new NatsTransporter(),
	logger: console,
	//logLevel: "debug",
	metrics: true,
	statistics: true,
	validation: true
});

// Load other services
broker.loadServices(path.join(__dirname, ".."), "*.service.js");

// Load metrics example service from Moleculer
//broker.createService(require("moleculer/examples/metrics.service.js")());

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,
	
	settings: {
		// Exposed port
		port: 4000,

		// Exposed IP
		ip: "0.0.0.0",

		// HTTPS server with certificate
		https: {
			key: fs.readFileSync(path.join(__dirname, "../ssl/key.pem")),
			cert: fs.readFileSync(path.join(__dirname, "../ssl/cert.pem"))
		},

		// Exposed path prefix
		path: "/api",

		routes: [

			/**
			 * This route demonstrates a protected `/api/admin` path to access `users.*` & internal actions. 
			 * To access them, you need to login first & use the received token in header
			 */
			{
				// Path prefix to this route
				path: "/admin",

				// Whitelist of actions (array of string mask or regex)
				whitelist: [
					"users.*",
					"$node.*"
				],

				authorization: true,

				roles: ["admin"],

				// Action aliases
				aliases: {
					"POST users": "users.create",
					"health": "$node.health"
				},

				// Use bodyparser module
				bodyParsers: {
					json: true
				},

				onBeforeCall(ctx, route, req, res) {
					this.logger.info("onBeforeCall in protected route");
					ctx.meta.authToken = req.headers["authorization"];
				},	

				onAfterCall(ctx, route, req, res, data) {
					this.logger.info("onAfterCall in protected route");
					res.setHeader("X-Custom-Header", "Authorized path");
				}							
			},

			/**
			 * This route demonstrates a public `/api` path to access `posts`, `file` and `math` actions.
			 */
			{
				// Path prefix to this route
				path: "/",

				// Whitelist of actions (array of string mask or regex)
				whitelist: [
					"auth.*",
					"file.*",
					"test.*",
					/^math\.\w+$/
				],

				authorization: false,

				// Convert "say-hi" action -> "sayHi"
				camelCaseNames: true,

				// Action aliases
				aliases: {
					"login": "auth.login",
					"add": "math.add",
					"add/:a/:b": "math.add",
					"GET sub": "math.sub",
					"POST divide": "math.div",
					"POST upload"(route, req, res) {
						this.parseUploadedFile(route, req, res);
					}
				},

				// Use bodyparser module
				bodyParsers: {
					json: true,
					urlencoded: { extended: true }
				},

				onBeforeCall(ctx, route, req, res) {
					return new this.Promise(resolve => {
						this.logger.info("async onBeforeCall in public");
						ctx.meta.userAgent = req.headers["user-agent"];
						//ctx.meta.headers = req.headers;
						resolve();
					});
				},

				onAfterCall(ctx, route, req, res, data) {
					this.logger.info("async onAfterCall in public");
					return new this.Promise(resolve => {
						res.setHeader("X-Response-Type", typeof(data));
						resolve();
					});					
				}

			}
		],

		// Folder to server assets (static files)
		assets: {
			// Root folder of assets
			folder: "./examples/full/assets",
			// Options to `server-static` module
			options: {}
		}

	},

	events: {
		"node.broken"(node) {
			this.logger.warn(`The ${node.id} node is disconnected!`);
		}
	},

	methods: {
		/**
		 * Authorize the request
		 * 
		 * @param {Context} ctx 
		 * @param {Object} route
		 * @param {IncomingRequest} req 
		 * @returns {Promise}
		 */
		authorize(ctx, route, req) {
			let authValue = req.headers["authorization"];
			if (authValue && authValue.startsWith("Bearer ")) {
				let token = authValue.slice(7);

				// Verify JWT token
				return ctx.call("auth.verifyToken", { token }).then(decoded => {
					//console.log("decoded data", decoded);

					// Check the user role
					if (route.opts.roles.indexOf(decoded.role) === -1)
						return this.Promise.reject(new ForbiddenError());

					// If authorization was success, we set the user entity to ctx.meta
					return ctx.call("auth.getUserByID", { id: decoded.id }).then(user => {
						ctx.meta.user = user;
						this.logger.info("Logged in user", user);
					});
				})

				.catch(err => {
					if (err instanceof MoleculerError)
						return this.Promise.reject(err);

					return this.Promise.reject(new UnAuthorizedError(ERR_INVALID_TOKEN));
				});

			} else
				return this.Promise.reject(new UnAuthorizedError(ERR_NO_TOKEN));
		},

		parseUploadedFile(route, req, res) {
			this.logger.info("Incoming file!");

			upload(req, res, err => {
				if (err) {
					this.logger.error("Error uploading file!", err);
					res.writeHead(500);
					return res.end("Error uploading file!", err);
				}

				res.writeHead(201);
				res.end();

				this.logger.info("File uploaded!", req.file);

				this.broker.emit("file.uploaded", res.file);
			});

		}
	}
});

// Start server
broker.start();
