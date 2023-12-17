"use strict";

/**
 * This example demonstrate to lock route aliases to a dedicated nodeID.
 * The nodeID can be defined in the `route.callOptions`.
 *
 * Example:
 *
 *  Call service only on `node-1`
 * 		GET http://localhost:3000/node-1/where
 *
 *  Call service only on `node-2`
 * 		GET http://localhost:3000/node-2/where
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
	nodeID: "api",
	transporter: "NATS",
});

// Load API Gateway
broker.createService({
	mixins: [ApiService],
	settings: {
		routes: [
			{
				path: "/node-1",

				aliases: {
					"GET /where": "test.where"
				},

				callOptions: {
					nodeID: "node-1"
				}
			},
			{
				path: "/node-2",

				aliases: {
					"GET /where": "test.where"
				},
				callOptions: {
					nodeID: "node-2"
				}
			},
		]
	}
});

const node1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
});
node1.loadService(path.join(__dirname, "..", "test.service.js"));

const node2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
});
node2.loadService(path.join(__dirname, "..", "test.service.js"));

// Start server
broker.Promise.all([broker.start(), node1.start(), node2.start()]).then(() => broker.repl());
