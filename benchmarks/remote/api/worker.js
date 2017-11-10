"use strict";

let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../../index");

// Create broker
let broker = new ServiceBroker({
	namespace: "benchmark",
	nodeID: process.argv[2] || "api-gw",
	logger: console,
	logLevel: "error",
	transporter: process.env.TRANSPORTER || "nats://localhost:4222"
});

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start()
	.then(() => console.log(`Worker '${broker.nodeID}' started.`));
