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
 *  - Set "Authorization: Bearer 123456" to header" and try again. Authorization will be success and receive the response
 * 
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");

const { UnAuthorizedError, ERR_NO_TOKEN, ERR_INVALID_TOKEN } = require("moleculer").Errors;

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

		routes: [
			{
				// Enable authorization
				authorization: true
			}
		]
	},

	methods: {
		/**
		 * Authorize the user from request
		 * 
		 * @param {Context} ctx 
		 * @param {Object} route
		 * @param {IncomingMessage} req 
		 * @param {ServerResponse} res 
		 * @returns 
		 */
		authorize(ctx, route, req, res) {
			let auth = req.headers["authorization"];
			if (auth && auth.startsWith("Bearer ")) {
				let token = auth.slice(7);
				if (token == "123456") {
					// Set the authorized user entity to `ctx.meta`
					ctx.meta.user = { id: 1, name: "John Doe" };
					return Promise.resolve(ctx);

				} else 
					return Promise.reject(new UnAuthorizedError(ERR_INVALID_TOKEN));

			} else
				return Promise.reject(new UnAuthorizedError(ERR_NO_TOKEN));
		}
	}
});

// Start server
broker.start();
