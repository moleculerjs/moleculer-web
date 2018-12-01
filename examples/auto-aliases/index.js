"use strict";

/**
 * This example uses API Gateway service auto-aliases generator feature.
 *
 * You don't need to create aliases for your actions. It collects & read from
 * action definitions & build aliases.
 *
 * Example:
 *
 *  - List posts
 * 		GET http://localhost:3000/api/posts
 *
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logFormatter: "short"
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));
broker.loadService(path.join(__dirname, "..", "post.service"));
broker.loadService(path.join(__dirname, "..", "auth.service"));

// Load API Gateway
broker.createService(ApiService, {
	settings: {
		routes: [
			{
				path: "api",

				whitelist: [
					"posts.*",
					"test.*"
				],

				aliases: {
					"GET /hi": "test.hello"
				},

				autoAliases: true
			},
			{
				path: "/admin",

				whitelist: [
					"auth.*"
				],

				autoAliases: true
			}
		]
	}
});

// Start server
broker.start().then(() => {
	broker.repl();

	/*setInterval(() => {
		const svc = broker.getLocalService("auth");
		if (!svc)
			broker.loadService(path.join(__dirname, "..", "auth.service"));
		else
			broker.destroyService(svc);


	}, 10 * 1000);*/
});
