"use strict";

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
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
