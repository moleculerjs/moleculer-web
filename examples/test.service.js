"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const { MoleculerError } = require("moleculer").Errors;

module.exports = {
	name: "test",
	actions: {
		hello: {
			handler(ctx) {
				ctx.meta.$responseType = "text/plain";
				return "Hello Moleculer";
			}
		},

		greeter: {
			params: {
				name: "string"
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
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

		sayHi(ctx) {
			return "Hi!";
		},

		utf(ctx) {
			return "ÉÁŰŐÚÖÜÓÍ éáűőúöüóí";
		},

		dangerZone: {
			publish: false,
			handler(ctx) {
				return "You cannot call this action via API Gateway!";
			}
		},

		slow(ctx) {
			let time = ctx.params.delay || 5000;
			return this.Promise.resolve().delay(time).then(() => `Done after ${time / 1000} sec!`);
		},

		wrong(ctx) {
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
	}
};
