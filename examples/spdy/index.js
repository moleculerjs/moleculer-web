"use strict";

/**
 * This example shows how to use an external HTTP server (like "spdy") with API Gateway
 *
 *  Example:
 *
 *  - Call "test.hello" action
 * 		https://localhost:3000/test/hello
 *
 *  - Call "test.hi" with alias
 * 		https://localhost:3000/hi?name=John
 */

let path 				= require("path");
let fs 					= require("fs");
let chalk 				= require("chalk");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");
let spdy 				= require("spdy");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,

	settings: {
		key: fs.readFileSync(path.join(__dirname, "../ssl/key.pem")),
		cert: fs.readFileSync(path.join(__dirname, "../ssl/cert.pem")),

		// **optional** SPDY-specific options
		spdy: {
			protocols: [ "h2", "spdy/3.1", "http/1.1" ],
			plain: false,
			"x-forwarded-for": true,
			connection: {
				windowSize: 1024 * 1024, // Server's window size
				autoSpdy31: false
			}
		},

		routes: [{
			whitelist: [
				"test.hello",
				"test.greeter"
			],
			aliases: {
				"GET hi": "test.greeter"
			}
		}]
	},

	methods: {
		createServer() {
			// More info: https://github.com/spdy-http2/node-spdy#usage
			this.server = spdy.createServer(this.settings, this.httpHandler);
			this.isHTTPS = true;
		}
	}
});

// Start server
broker.start();
