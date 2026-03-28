"use strict";

/**
 * This example uses API Gateway & Socket.IO for websocket connections.
 *
 * Example:
 *
 * Open http://localhost:3000/ in your browser. The page is loaded from
 * the `assets` folder. The page contains a button named "Call math.add via websocket". If you push the button, the browser emits a websocket event to the API Gateway service. It executes the request and send back the response to the browser via websocket of course.
 *
 * Otherwise the service subscribe to all events, what will send to the browser, so if you push the button you will see the metrics events in your browser.
 *
 */

let path = require("path");
let { ServiceBroker } = require("moleculer");
let ApiGatewayService = require("../../index");
let IO = require("socket.io");

// Create broker
let broker = new ServiceBroker({
	logger: console,
	metrics: true,
	validation: true
});

// Load other services
broker.loadService(path.join(__dirname, "..", "math.service"));
broker.loadService(path.join(__dirname, "..", "post.service"));

// Load API Gateway
broker.createService({
	mixins: [ApiGatewayService],
	settings: {
		assets: {
			folder: path.join(__dirname, "assets")
		},

		routes: [
			{
				path: "/api"
			}
		]
	},

	events: {
		"**"(payload, sender, event) {
			if (this.io)
				this.io.emit("event", {
					sender,
					event,
					payload
				});
		}
	},

	started() {
		// Create a Socket.IO instance, passing it our server
		this.io = IO.listen(this.server);

		// Add a connect listener
		this.io.on("connection", client => {
			this.logger.info("Client connected via websocket!");

			client.on("call", ({ action, params, opts }, done) => {
				this.logger.info(
					"Received request from client! Action:",
					action,
					", Params:",
					params
				);

				this.broker
					.call(action, params, opts)
					.then(res => {
						if (done) done(res);
					})
					.catch(err => this.logger.error(err));
			});

			client.on("disconnect", () => {
				this.logger.info("Client disconnected");
			});
		});
	}
});

// Start server
broker.start();
