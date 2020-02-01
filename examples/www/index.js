"use strict";

/**
 * This example uses API Gateway as a HTTP Web server to serve static assets files & actions of services under `/api`.
 * Metrics, statistics, validation features of Moleculer is enabled.
 *
 * Example:
 *
 *  - Open index.html
 * 		http://localhost:3000
 *
 *  - Access to assets
 * 		http://localhost:3000/images/logo.png
 *
 *  - API: Add two numbers (use alias name)
 * 		http://localhost:3000/api/add?a=25&b=13
 *
 *  - API: Divide two numbers with validation
 * 		http://localhost:3000/api/math/div?a=25&b=13
 * 		http://localhost:3000/api/math/div?a=25      <-- Throw validation error because b is missing
 *
 *  - API: get health info
 * 		http://localhost:3000/api/~node/health
 *
 *  - API: try call action which is not in whitelist
 * 		http://localhost:3000/api/~node/actions     <-- Throw "Not Implemented" error
 *
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");

// Create broker
let broker = new ServiceBroker({
	//logLevel: "debug",
	metrics: true
});

// Load other services
broker.loadService(path.join(__dirname, "..", "math.service"));
broker.loadService(path.join(__dirname, "..", "file.service"));

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,

	settings: {

		// Folder to server assets (static files)
		assets: {
			// Root folder of assets
			folder: path.join(__dirname, "assets"),
			// Options to `server-static` module
			options: {}
		},

		routes: [
			{
				path: "/api",

				// Whitelist of actions (array of string mask or regex)
				whitelist: [
					"file.*",
					/^math\.\w+$/,
					"$node.health"
				],

				// Action aliases
				aliases: {
					"add": "math.add",
					"GET  	health": "$node.health",
					"POST 	divide": "math.div",
					"other": [
						function(req, res, next) { this.logger.info("Middleware 1"); next(); },
						function(req, res, next) { this.logger.info("Middleware 2"); next(); },
						//"file.html"
						function(req, res, next) {
							this.logger.info("Custom alias", req.$ctx.id);
							//res.end();
							next(new Error("Wrong"));
						},
						function(req, res, next) { this.logger.info("Middleware 3"); res.end(); },
						function(err, req, res, next) { this.logger.info("Error Middleware 4"); res.end(err.message); },
					]
				},

				// Use bodyparser modules
				bodyParsers: {
					json: true,
					urlencoded: { extended: true }
				}

			}
		],

		logRequestParams: "info"

	}
});

// Start server
broker.start();
