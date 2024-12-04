"use strict";

/**
 * This is a Webpack demo which demonstrates how you can
 * create a Vue client app with Moleculer Web API Gateway
 *
 * 1. First install dependencies in this folder with
 * 		`npm install` command.
 *
 * 2. Start the server with `npm start`
 *
 * 3. Open the http://localhost:3000/ address in your browser.
 *    You will see a simple page with two texts. It is a VueJS
 *    application what Webpack built.
 *
 * 4. Try the hot-module-replacement. Open the `App.vue`
 *    and edit the file. Change the values in `data` or
 *    change the styles. Save the file and the content
 *    will be updated in your browser.
 *
 */

let path = require("path");
let { ServiceBroker } = require("moleculer");
let ApiService = require("../../index");

const webpack = require("webpack");
const devMiddleware = require("webpack-dev-middleware");
const hotMiddleware = require("webpack-hot-middleware");
const serveStatic = require("serve-static");

const config = require("./webpack.config");
const compiler = webpack(config);

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

				// Action aliases
				aliases: {
					add: "math.add",
					"GET hello": "test.hello",
					"GET health": "$node.health"
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
					devMiddleware(compiler, {
						noInfo: true,
						publicPath: config.output.publicPath,
						headers: { "Access-Control-Allow-Origin": "*" }
					}),
					hotMiddleware(compiler, {
						log: broker.logger.info
					}),
					serveStatic(path.join(__dirname, "public"))
				]
			}
		]
	}
});

// Start server
broker.start();
