"use strict";

/**
 * This is a Webpack demo which demonstrates how you can
 * create a Webpack client app with Moleculer Web API Gateway
 *
 * Open the http://localhost:3000/ address in your browser.
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("../../index");

const webpack	 		= require("webpack");
const devMiddleware 	= require("webpack-dev-middleware");
const compression		= require("compression");
const serveStatic 		= require("serve-static");

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
				path: "/",

				// Middlewares
				use: [
					/*function(req, res, next) {
						next(new Error("Hiba"));
					},*/
					compression(),
					devMiddleware(compiler, {
						noInfo: true,
						publicPath: config.output.publicPath,
						headers: { "Access-Control-Allow-Origin": "*" }
					}),
					serveStatic(path.join(__dirname, "public"))
				],
			},
		],
	}
});

// Start server
broker.start();
