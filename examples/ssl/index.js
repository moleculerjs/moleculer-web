"use strict";

/**
 * This example demonstrates how to use API Gateway as HTTPS server with whitelist.
 * 
 * You can access only to math.add, math.div & file.* actions via https://localhost:3000
 * 
 * Example:
 * 	
 *  - Add two numbers
 * 		https://localhost:3000/math/add?a=25&b=13
 * 
 *  - Divide two numbers
 * 		https://localhost:3000/math/add?a=25&b=13
 * 
 *  - Get the logo image (Content-Type: image/png)
 * 		https://localhost:3000/file/image
 * 
 * 
 */

let fs	 				= require("fs");
let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "math.service"));
broker.loadService(path.join(__dirname, "..", "file.service"));

// Load API Gateway
broker.createService({
	mixins: ApiService,

	// Override default settings
	settings: {
		// HTTPS server with certificate
		https: {
			key: fs.readFileSync(path.join(__dirname, "key.pem")),
			cert: fs.readFileSync(path.join(__dirname, "cert.pem"))
		},

		routes: [
			// Create a route with whitelist & body-parser
			{
				path: "/",
				whitelist: [
					"math.*",
					"file.image"
				],

				// Use JSON body-parser module
				bodyParsers: {
					json: true
				}			
			}
		]
	}
});

// Start server
broker.start();
