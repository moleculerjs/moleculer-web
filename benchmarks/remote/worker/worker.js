"use strict";

let { ServiceBroker } 	= require("moleculer");

// Create broker
let broker = new ServiceBroker({
	namespace: "benchmark",
	nodeID: process.argv[2],
	logger: console,
	logLevel: "error",
	transporter: process.env.TRANSPORTER || "nats://localhost:4222"
});

broker.createService({
	name: "test",
	actions: {
		hello() {
			return `Hello from '${broker.nodeID}'`;
		}
	}
});

// Start server
broker.start()
	.then(() => console.log(`Worker '${broker.nodeID}' started.`));
