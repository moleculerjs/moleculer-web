"use strict";

/**
 * This example uses API Gateway service with default settings.
 * 
 * You can access to math.* & internal $node.* actions via http://localhost:3000
 * 
 * Example:
 * 	
 *  - Hello action
 * 		http://localhost:3000/test/hello
 * 
 *  - Add two numbers
 * 		http://localhost:3000/math/add?a=25&b=13
 * 
 *  - Get health info
 * 		http://localhost:3000/~node/health
 * 
 *  - List of actions
 * 		http://localhost:3000/~node/actions
 * 
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start();
