"use strict";

/**
 * This example shows how to use Moleculer-Web as an ExpressJS middleware
 * 
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");
let express 			= require("express");

const { CustomError } = require("moleculer").Errors;

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
const svc = broker.createService(ApiGatewayService, {
	settings: {
		middleware: true,
		routes: [{
			whitelist: [
				"test.hello",
				"test.greeter"
			],
			aliases: {
				"GET hi": "test.greeter"
			}
		}]
	}
});

// Create Express application
const app = express();

// Use ApiGateway as middleware
app.use("/api", svc.express());

// Listening
app.listen(3333, err => {
	if (err)
		return console.error(err);

	console.log("Open http://localhost:3333/api/test/hello");
});

// Start server
broker.start();
