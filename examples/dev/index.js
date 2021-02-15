"use strict";

const { ServiceBroker } 	= require("moleculer");
const ApiService 			= require("../../index");

// Create broker
const broker = new ServiceBroker();

const FLAG_SAMPLED = 0x00000001;

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
		}],
		/*rootCallOptions: {
			timeout: 300
		}*/
		rootCallOptions(options, req, res) {
			if (req.headers["traceparent"]) {
				// More info https://www.w3.org/TR/trace-context/#traceparent-header
				const traceparent = req.headers["traceparent"].toLowerCase();
				if (traceparent.match(/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/)) {
					const [version, id, parentSpan, flags] = traceparent.split("-");
					const sampled = (flags & FLAG_SAMPLED) == FLAG_SAMPLED;

					options.parentSpan = {
						id: parentSpan,
						traceID: id,
						sampled
					};
				}
			} else {
				// Look for X-B3-Traceid, X-B3-Spanid
				options.parentSpan = {};

				if (req.headers["x-b3-traceid"]) {
					options.parentSpan.traceID = req.headers["x-b3-traceid"].toLowerCase();
					options.parentSpan.sampled = true;
				}
				if (req.headers["x-b3-spanid"]) {
					options.parentSpan.id = req.headers["x-b3-spanid"].toLowerCase();
				}
			}
		}
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
