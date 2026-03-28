"use strict";

const { ServiceBroker } = require("moleculer");
const ApiService = require("../../index");

// Create broker
const broker = new ServiceBroker();

// Load API Gateway
broker.createService({
	name: "api",
	mixins: [ApiService],
	settings: {
		path: "/api",
		routes: [
			{
				name: "no-auth-route",
				path: "/",
				aliases: {
					hi: "greeter.hello"
				}
			},
			{
				name: "only-auth-route",
				path: "/",
				aliases: {
					hello: "greeter.hello"
				},
				authorization: true
			}
		]
	},

	methods: {
		authorize(ctx) {
			this.logger.warn("AUTHORIZE");
			return true;
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return { result: "Hello" };
		}
	}
});

// Start server
broker.start().then(() => broker.repl());
