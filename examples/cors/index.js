"use strict";

/**
 * Call the endpoints from https://cors-tester.glitch.me/
 */

const { ServiceBroker } = require("moleculer");
const ApiService 		= require("../../index");

// Create broker
const broker = new ServiceBroker();

// Load other services
broker.createService({
	name: "greeter",
	actions: {
		welcome(ctx) {
			return { response: `Hello ${ctx.params.name || "Anonymous"}` };
		}
	}
});

// Load API Gateway
broker.createService({
	name: "api",
	mixins: [ApiService],

	settings: {
		cors: true,
		routes: [
			{
				path: "/api1",

				aliases: {
					"welcome": {
						method: "POST",
						fullPath: "/welcome",
						action: "greeter.welcome"
					}
				},
			},
			{
				path: "/api2",

				aliases: {
					"welcome": {
						method: "POST",
						fullPath: "/api2/welcome",
						action: "greeter.welcome"
					}
				},
			}
		]
	}
});

// Start server
broker.start().then(() => broker.repl());
