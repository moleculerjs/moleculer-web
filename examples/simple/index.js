"use strict";

/**
 * This example uses API Gateway service with default settings.
 *
 * You can access to test.*, math.* & internal $node.* actions via http://localhost:3000/api
 *
 * Example:
 *
 *  - Hello action
 * 		http://localhost:3000/api/test/hello
 *
 *  - Add two numbers
 * 		http://localhost:3000/api/math/add?a=25&b=13
 *
 *  - Get health info
 * 		http://localhost:3000/api/~node/health
 *
 *  - List of actions
 * 		http://localhost:3000/api/~node/actions
 *
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");
let { inspect } 		= require("util");

// Create broker
let broker = new ServiceBroker({
	metrics: true,
	logFormatter: "short",
	logObjectPrinter: o => inspect(o, { depth: 4, colors: true, breakLength: 100 }),
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));

// Load API Gateway
broker.createService({
	name: "api",
	mixins: [ApiService],
	settings: {
		routes: [{
			path: "/api"
		}]
	},
	actions: {
		rest: {
			metrics: {
				params: ({ req, res }) => {
					return {
						http: {
							method: req.method,
							url: req.url,
							statusCode: res.statusCode
						}
					};
				}
			}
		}
	}
});

/*broker.createService({
	name: "metrics",
	events: {
		"metrics.trace.span.finish"(payload) {
			if (payload.action.name == "api.rest")
				this.logger.info("Metrics event:", payload);
		}
	}
});*/

// Start server
broker.start().then(() => broker.repl());
