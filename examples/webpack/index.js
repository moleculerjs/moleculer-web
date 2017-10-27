"use strict";

/**
 *
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

const webpack	 		= require("webpack");
const devMiddleware 	= require("webpack-dev-middleware");
const hotMiddleware 	= require("webpack-hot-middleware");

const config 			= require("./webpack.config");
const compiler 			= webpack(config);

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

			},
			{
				path: "/",

				// Middlewares
				use: [
					/*function (req, res, next) {
						this.logger.info("req.url:", req.url);
						this.logger.info("res.statusCode:", res.statusCode);
						next();
					},*/
					devMiddleware(compiler, {
						noInfo: true,
						publicPath: config.output.publicPath,
						headers: { "Access-Control-Allow-Origin": "*" }
					}),
					hotMiddleware(compiler, {
						log: broker.logger.info
					})
				],

				// Serve assets (static files)
				assets: {
					// Root folder of assets
					folder: path.join(__dirname, "public"),
					// Options to `server-static` module
					options: {}
				},

			}
		],
	}
});

// Start server
broker.start();
