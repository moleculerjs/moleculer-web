"use strict";

/**
 * This example shows how to use authorization with API Gateway
 * 
 * Example:
 * 	
 *  - Try to call /test/hello. It will throw Forbidden
 * 
 * 		http://localhost:3000/test/hello
 * 	
 *  - Set "Authorization: Bearer 123456" to header" and try again. It will receive the response
 * 
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");

const { CustomError } = require("moleculer").Errors;

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService(ApiGatewayService, {
	settings: {

		routes: [
			{
				authorization: true
			}
		]
	},

	methods: {
		authorize(ctx, req, res) {
			let authValue = req.headers["authorization"];
			if (authValue && authValue.startsWith("Bearer")) {
				let token = authValue.split(" ")[1];
				if (token == "123456") {
					ctx.meta.user = { id: 1, name: "John Doe" };
					return Promise.resolve();
				} else 
					return Promise.reject(new CustomError("Unauthorized! Invalid token", 401));
			} else
				return Promise.reject(new CustomError("Unauthorized! Missing token", 401));
		}
	}
});

// Start server
broker.start();
