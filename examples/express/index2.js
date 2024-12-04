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

const path = require("path");
const { ServiceBroker } = require("moleculer");
const ApiGatewayService = require("../../index");
const express = require("express");

// Create broker
const broker = new ServiceBroker();

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService({
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
	},

	started() {
		// Create Express application
		const app = express();

		// Use ApiGateway as middleware
		app.use("/api", this.express());

		// Listening
		app.listen(3333, err => {
			if (err) return this.logger.error(err);

			this.logger.info("Open http://localhost:3333/api/hi?name=John");
		});
	}
});

// Start server
broker.start();
