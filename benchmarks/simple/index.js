/* eslint-disable no-console */
"use strict";

const { ServiceBroker } 	= require("moleculer");
const ApiService 			= require("../../index");

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "warn"
});

broker.createService({
	name: "test",
	actions: {
		hello() {
			return "Hello";
		}
	}
});

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start()
	.then(() => console.log("Test URL: http://localhost:3000/test/hello"));

/**
 * Result on i7 4770K 32GB RAM Windows 10 x64
 *
 * 	Throughtput: 14 427 req/sec
 */
