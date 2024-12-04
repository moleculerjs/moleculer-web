"use strict";

/**
 * This example shows how to use Moleculer-Web as an ExpressJS middleware
 *
 *  Example:
 *
 *  - Call test.hello action
 * 		http://localhost:3333/api/test/hello
 *
 *  - Call test.hi with alias
 * 		http://localhost:3333/api/hi?name=John
 */

let path = require("path");
let { ServiceBroker } = require("moleculer");
let ApiGatewayService = require("../../index");
let express = require("express");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
const svc = broker.createService({
	mixins: [ApiGatewayService],

	settings: {
		server: false,
		routes: [
			{
				whitelist: ["test.hello", "test.greeter"],
				aliases: {
					"GET hi": "test.greeter"
				},
				mappingPolicy: "all"
			}
		]
	}
});

// Create Express application
const app = express();

// Use ApiGateway as middleware
app.use("/api", svc.express());

// Listening
app.listen(3333, err => {
	if (err) return console.error(err);

	console.log("Open http://localhost:3333/api/test/hello");
});

// Start server
broker.start();
