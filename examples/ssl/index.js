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
broker.createService(ApiService, {

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

/*
"use strict";

let fs = require("fs");
let path = require("path");

let { ServiceBroker } = require("moleculer");
let MemoryCacher = require("moleculer").Cachers.Memory;
let NatsTransporter = require("moleculer").Transporters.NATS;

let ApiGatewayService = require("../../index");

// Create broker
let broker = new ServiceBroker({
	//cacher: new MemoryCacher(),
	//transporter: new NatsTransporter(),
	nodeID: "server",
	logger: console,
	logLevel: {
		"*": "info",
		"API-GW-SVC": "debug"
	},
	metrics: true,
	metricsRate: 1,
	statistics: true,

	validation: true
	
});

//broker.on("metrics.**", console.log);

//broker.loadServices(path.join(__dirname, ".."));

//broker.loadService(path.join(__dirname, "..", "api.service"));
broker.loadService(path.join(__dirname, "..", "auth.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));
broker.loadService(path.join(__dirname, "..", "file.service"));
//broker.loadService(path.join(__dirname, "..", "metrics.service"));

broker.createService(ApiGatewayService, {
	settings: {

		// Exposed port
		port: process.env.PORT || 4000,

		// Exposed IP
		ip: process.env.IP || "0.0.0.0",

		// HTTPS server with certificate
		_https: {
			key: fs.readFileSync("examples/www/ssl/key.pem"),
			cert: fs.readFileSync("examples/www/ssl/cert.pem")
		},

		// Exposed path prefix
		path: "/api",

		routes: [
			{
				// Path prefix to this route
				path: "/admin",

				// Whitelist of actions (array of string mask or regex)
				whitelist: [
					"users.get",
					"$node.*"
				],

				authorization: true,

				// Action aliases
				aliases: {
					"POST users": "users.create",
					"health": "$node.health"
				},

				// Use bodyparser module
				bodyParsers: {
					json: true
				}
			},

			{
				// Path prefix to this route
				path: "/",

				// Whitelist of actions (array of string mask or regex)
				whitelist: [
					"posts.*",
					"file.*",
					/^math\.\w+$/
				],

				authorization: false,

				// Action aliases
				aliases: {
					"add": "math.add",
					"GET sub": "math.sub",
					"POST divide": "math.div",
				},

				// Use bodyparser module
				bodyParsers: {
					json: true,
					urlencoded: { extended: true }
				}

			}
		],

		// Folder to server assets (static files)
		assets: {
			// Root folder of assets
			folder: "./examples/www/assets",
			// Options to `server-static` module
			options: {}
		}

	}
});


broker.start();
*/