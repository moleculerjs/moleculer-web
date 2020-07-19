"use strict";

/**
 * This example uses API Gateway service with default settings.
 *
 * You can access to test.*, math.* & internal $node.* actions via http://localhost:3000/api
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

const path 				= require("path");
const { ServiceBroker } = require("moleculer");
const ApiService 		= require("../../index");

// Create broker
const broker = new ServiceBroker();

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start().then(() => broker.repl());
