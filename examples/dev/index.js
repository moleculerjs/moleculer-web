"use strict";

const { ServiceBroker } 	= require("moleculer");
const ApiService 			= require("../../index");

// Create broker
const broker = new ServiceBroker();

// Load API Gateway
broker.createService({
	name: "api",
	mixins: [ApiService],
	settings: {
		routes: [{
			path: "/api",
			onBeforeCall(ctx) {
				ctx.meta.a = 5;
			}
		}]
	}
});

broker.createService({
	name: "test",
	actions: {
		check(ctx) {
			this.logger.info("Meta", ctx.meta);
			return { result: "OK" };
		}
	}
});

// Start server
broker.start().then(() => broker.repl());
