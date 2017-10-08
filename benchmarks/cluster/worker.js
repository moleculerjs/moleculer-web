"use strict";

let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2],
	logger: console,
	logLevel: "error"
});

broker.createService({
	name: "test",
	actions: {
		hello() {
			return "Hello Moleculer";
		}
	}
});

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start();
