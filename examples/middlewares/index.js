"use strict";

/**
 * This example uses API Gateway service with default settings.
 *
 * You can access to test.*, math.* & internal $node.* actions via http://localhost:3000
 *
 * Example:
 *
 *  - Hello action
 * 		http://localhost:3000/test/hello
 *
 *
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService(ApiService, {
	settings: {
		routes: [
			{
				path: "/api",
				whitelist: ["**"]
			},
			{
				path: "/danger",
				whitelist: ["**"],
				use: [
					(req, res, next) => next(new Error("Something went wrong")),
					function (err, req, res, next) {
						this.logger.warn("Error occured in middlewares! Terminating request and sending response");
						res.end("Handled. No problem.");
					},
				],
			}
		]
	}
});

// Start server
broker.start().then(() => broker.repl());
