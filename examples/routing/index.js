"use strict";

/**
 * This example uses API Gateway and demonstrates routing features.
 *
 * Example:
 *
 *  - Call a defined alias
 * 		GET http://localhost:3000/defined/posts
 *
 *  - Call a not aliased service
 * 		GET http://localhost:3000/unsecure/math.add?a=5&b=4
 *
 *  - Call a generated alias
 * 		GET http://localhost:3000/generated/auth/login?username=admin&password=admin
 *
 *  - Parameter in route path
 * 		GET http://localhost:3000/lang/en
 */

const path				= require("path");
const { ServiceBroker } 	= require("moleculer");
const ApiGatewayService 	= require("../../index");

// Create broker
const broker = new ServiceBroker();

// Load other services
broker.loadService(path.join(__dirname, "..", "post.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));
broker.loadService(path.join(__dirname, "..", "auth.service"));
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,
	settings: {
		optimizeOrder: false,
		routes: [
			{
				path: "/defined/",
				aliases: {
					"GET posts": "posts.list"
				},
			},
			{
				path: "/unsecure",
				whitelist: [
					"math.*"
				],
			},
			{
				path: "/generated",
				whitelist: [
					"auth.*"
				],
				autoAliases: true,
			},
			{
				path: "/params",
				autoAliases: true,
			},
			{
				path: "/lang/:lng/",
				aliases: {
					"GET /": (req, res) => {
						res.end("Received lang: " + req.$params.lng);
					}
				}
			}
		]
	}
});

// Start server
broker.start();
