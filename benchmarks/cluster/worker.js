"use strict";

const { ServiceBroker } = require("moleculer");
const ApiService = require("../../index");

// Create broker
const broker = new ServiceBroker({
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
broker.start().then(() => console.log(`Worker '${broker.nodeID}' started.`));
