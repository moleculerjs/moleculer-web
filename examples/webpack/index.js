"use strict";

/**
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
broker.createService({
	mixins: [ApiService],

	settings: {

		routes: [
			{
				path: "/",

				// Folder to server assets (static files)
				assets: {
					// Root folder of assets
					folder: path.join(__dirname, "public"),
					// Options to `server-static` module
					options: {}
				},

			},
			{
				path: "/api",

				// Whitelist of actions (array of string mask or regex)
				whitelist: [
					"file.*",
					/^math\.\w+$/,
					"$node.health"
				],

				// Action aliases
				aliases: {
					"add": "math.add",
					"GET health": "$node.health",
					"POST divide": "math.div"
				},

				// Use bodyparser modules
				bodyParsers: {
					json: true,
					urlencoded: { extended: true }
				}

			}
		],
	}
});

// Start server
broker.start();
