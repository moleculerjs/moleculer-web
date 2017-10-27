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

				use: [
					function (route, req, res) {
						this.logger.info("req.url:", req.url);
						this.logger.info("res.statusCode:", res.statusCode);
						//return this.Promise.resolve().delay(1000);
					},
					webpackMiddleware(),
					webpackHotMiddleware()
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

function webpackMiddleware() {
	const instance = devMiddleware(compiler, {
		noInfo: true,
		publicPath: config.output.publicPath,
		headers: { "Access-Control-Allow-Origin": "*" }
	});

	return function webpackMiddleware(route, req, res) {
		const p = new this.Promise((resolve, reject) => {
			instance.waitUntilValid(resolve);
			compiler.plugin("failed", reject);
		})
			.then(() => instance(req, res, () => {}))
			.then(() => {
				if (res.headersSent)
					p.cancel();
			});

		return p;
	};
}

function webpackHotMiddleware() {
	const instance = hotMiddleware(compiler, {
		log: broker.logger.info
	});

	return function webpackHotMiddleware(route, req, res) {
		let p = this.Promise.resolve()
			.then(() => new this.Promise((resolve, reject) => {
				let wasNext = false;
				instance(req, res, () => {
					this.logger.info("next");
					wasNext = true;
					resolve();
				});
				this.logger.info("next2");
				if (!wasNext)
					p.cancel();
				resolve();
			}));

		return p;
	};
}
