"use strict";

/**
 * This example uses API Gateway as a RESTful API server with caching.
 *
 * Example:
 *
 *  - Get all posts  ( Please not if you call it again, it will come from cache! )
 * 		GET http://localhost:3000/posts
 *
 *  - Create a new post  ( it will clear the cache )
 * 		POST http://localhost:3000/posts
 *    Body
 * 		{
 * 			"title": "New post via REST",
 * 			"content": "Moleculer is awesome!",
 * 			"id": 11
 * 		}
 *
 *  - Get a post by ID  ( Please not if you call it again, it will come from cache! )
 * 		GET http://localhost:3000/posts/11
 *
 *  - Update a post by ID  ( it will clear the cache )
 * 		PUT http://localhost:3000/posts/11
 * 		{
 * 			"title": "Modified post",
 * 			"content": "New content"
 * 		}
 *
 *  - Remove a post by ID  ( it will clear the cache )
 * 		DELETE http://localhost:3000/posts/11
 *
 */

let path				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");
let IO 					= require("socket.io");

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
			folder: path.join(__dirname, "assets"),
		},

		routes: [{
			path: "/api"
		}]
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
				this.logger.info("Received request from client! Action:", action, ", Params:", params);

				this.broker.call(action, params, opts)
					.then(res => {
						if (done)
							done(res);
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
