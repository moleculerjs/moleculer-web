"use strict";

/**
 * This example shows how to use authentication with API Gateway
 *
 * Example:
 *
 *  - Try to call /test/whoami. It will show a message "Who are you?"
 *
 * 		http://localhost:3000/test/whoami
 *
 *  - Set a query param "access_token" with value "12345" and try again. Authentication will succeed and a message with the "Hello John" will be shown
 *
 */

let path = require("path");
let { ServiceBroker } = require("moleculer");
let ApiGatewayService = require("../../index");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService({
	mixins: [ApiGatewayService],

	settings: {
		routes: [
			{
				// Enable authentication
				authentication: true
			}
		]
	},

	methods: {
		/**
		 * Authenticate the user from request
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {IncomingMessage} req
		 * @param {ServerResponse} res
		 * @returns
		 */
		authenticate(ctx, route, req, res) {
			let accessToken = req.query["access_token"];
			if (accessToken) {
				if (accessToken === "12345") {
					return Promise.resolve({ id: 1, username: "john.doe", name: "John Doe" });
				} else {
					return Promise.reject();
				}
			} else {
				return Promise.resolve(null);
			}
		}
	}
});

// Start server
broker.start();
