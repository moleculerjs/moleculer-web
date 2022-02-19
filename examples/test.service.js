"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const { MoleculerError } = require("moleculer").Errors;

module.exports = {
	name: "test",
	settings: {
		rest: ""
	},

	events: {
		"$api.aliases.regenerated"() {
			this.logger.info("Aliases regenerated!");
		}
	},

	actions: {
		hello: {
			rest: "GET /hello",
			handler(ctx) {
				ctx.meta.$responseType = "text/plain";
				return "Hello Moleculer";
			}
		},

		greeter: {
			params: {
				name: "string"
			},
			rest: "GET /greeter",
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		},

		whoami: {
			handler(ctx) {
				if (ctx.meta.user) {
					return `Hello ${ctx.meta.user.username || "no-name-user"}`;
				} else {
					return "Who are you?";
				}
			}
		},

		echo: {
			handler(ctx) {
				return {
					action: _.omit(ctx.action, ["handler", "service"]),
					params: ctx.params,
					meta: ctx.meta
				};
			}
		},

		redirect(ctx) {
			ctx.meta.$statusCode = 302;
			ctx.meta.$statusMessage = "Redirecting...";
			ctx.meta.$location = "/test/hello";

			return "REDIRECT";
		},

		noContent(ctx) {
			ctx.meta.$statusCode = 204;
		},

		sayHi: {
			rest: {
				method: "GET",
				fullPath: "/hi"
			},
			handler(ctx) {
				return "Hi!";
			}
		},

		utf(ctx) {
			return "ÉÁŰŐÚÖÜÓÍ éáűőúöüóí";
		},

		dangerZone: {
			visibility: "public",
			rest: "dangerZone",
			handler(ctx) {
				return "You cannot call this action via API Gateway!";
			}
		},

		slow(ctx) {
			let time = ctx.params.delay || 5000;
			return this.Promise.resolve().delay(time).then(() => `Done after ${time / 1000} sec!`);
		},

		wrong(ctx) {
			ctx.meta.$responseType = "text/plain";
			ctx.meta.$responseHeaders = {
				"X-Custom-Header": "Custom content"
			};

			throw new MoleculerError("It is a wrong action! I always throw error!");
		},

		stream: {
			handler(ctx) {
				ctx.meta.$responseHeaders = {
					"Content-Disposition": "attachment; filename=\"stream-lorem.txt\""
				};
				const stream = fs.createReadStream(path.join(__dirname, "..", "test", "assets", "lorem.txt"), "utf8");
				setTimeout(() => {
					stream.read(1024);
				}, 100);

				return stream;
			}
		},

		save: {
			rest: {
				method: "POST",
				path: "/stream",
				type: "stream"
			},
			handler(ctx) {
				this.logger.info("Received stream:", ctx.params);
			}
		},

		where(ctx) {
			return `Response from ${this.broker.nodeID}`;
		},

		func2: {
			rest : "GET /fixed/:param1/:param2",
			visibility : "published",
			async handler(ctx) {
				return Promise.resolve("func2");
			}
		},

		func1: {
			rest : "GET /:param1/:param2/:param3/:param4?",
			visibility : "published",
			async handler(ctx) {
				return Promise.resolve("func1");
			}
		}
	}
};
