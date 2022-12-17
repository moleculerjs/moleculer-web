"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");

const { MoleculerServerError } = require("moleculer").Errors;

module.exports = {
	name: "test",

	settings: {
		rest: "/"
	},

	actions: {
		hello: {
			rest: "GET /hi",
			handler(ctx) {
				return "Hello Moleculer";
			}
		},

		greeter: {
			rest: "/greeter",
			params: {
				name: "string"
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		},

		fullPath: {
			rest: {
				method: "GET",
				fullPath: "/fullPath",
			},
			handler(ctx) {
				return "Full path";
			}
		},

		basePath: {
			rest: {
				method: "GET",
				path: "/base-path",
				basePath: "custom-base-path"
			},
			handler(ctx) {
				return "Hello Custom Moleculer Root Path";
			}
		},

		basePathError: {
			rest: {
				method: "GET",
				path: "/base-path-error"
			},
			handler(ctx) {
				return "Hello Custom Moleculer Root Path with Error";
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

		apitimeout: {
			rest: "/apitimeout",
			params: {
				counter: "number",
				sleeptime: "number"
			},
			async handler(ctx) {
				function sleep(ms) {
					return new Promise(resolve => setTimeout(resolve, ms));
				}
				try {
					let c = 0;
					while (c != ctx.params.counter) {
						await sleep(ctx.params.sleeptime);
						c++;
					}
					return {
						status: 200,
						msg: "apitimeout response"
					};
				} catch (e) {
					return {
						status: 500,
						msg: "apitimeout response",
						error: e
					};
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

		params: {
			handler(ctx) {
				return ctx.params;
			}
		},

		reqres: {
			handler(ctx) {
				return {
					hasReq: !!ctx.params.$req,
					hasRes: !!ctx.params.$res,
					a: ctx.params.a
				};
			}
		},

		dangerZone: {
			visibility: "public",
			handler(ctx) {
				return "Danger zone 2!";
			}
		},

		text(ctx) {
			return "String text";
		},

		textPlain: {
			handler(ctx) {
				ctx.meta.$responseType = "text/plain";

				return "Plain text";
			}
		},

		number(ctx) {
			return 123;
		},

		numberPlain: {
			handler(ctx) {
				ctx.meta.$responseType = "text/plain";
				return 123;
			}
		},

		boolean(ctx) {
			return true;
		},

		json(ctx) {
			return {
				id: 1,
				name: "Eddie"
			};
		},

		jsonArray(ctx) {
			return [
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			];
		},

		function(ctx) {
			return () => { };
		},

		nothing(ctx) { },

		null(ctx) {
			return null;
		},

		buffer: {
			handler(ctx) {
				return Buffer.from("Buffer response");
			}
		},

		bufferObj: {
			handler(ctx) {
				return JSON.parse(JSON.stringify(Buffer.from("Buffer object response")));
			}
		},

		bufferJson: {
			handler(ctx) {
				ctx.meta.$responseType = "application/json";
				return Buffer.from("{ \"a\": 5 }");
			}
		},

		customHeader: {
			handler(ctx) {
				ctx.meta.$responseHeaders = {
					"X-Custom-Header": "working",
					"Content-Type": "text/plain"
				};
				return "CustomHeader";
			}
		},

		customStatus: {
			handler(ctx) {
				ctx.meta.$statusCode = 201;
				ctx.meta.$location = "/new/entity";
				ctx.meta.$statusMessage = "Entity created";
			}
		},

		redirect: {
			handler(ctx) {
				ctx.meta.$statusCode = 302;
				ctx.meta.$statusMessage = "Redirecting...";
				ctx.meta.$location = "/test/hello";

				return "REDIRECT";
			}
		},

		stream: {
			handler(ctx) {
				ctx.meta.$responseHeaders = {
					"Content-Disposition": "attachment; filename=\"stream-lorem.txt\""
				};
				const stream = fs.createReadStream(path.join(__dirname, "..", "assets", "lorem.txt"), "utf8");
				setTimeout(() => {
					stream.read(1024);
				}, 100);

				return stream;
			}
		},

		streamWithError(ctx) {
			ctx.meta.$responseHeaders = {
				"Content-Disposition": "attachment; filename=\"stream-lorem.txt\""
			};
			const stream = fs.createReadStream(path.join(__dirname, "..", "assets", "lorem.txt"), "utf8");
			setTimeout(() => {
				stream.emit("error", new MoleculerServerError("Something happened!"));
			}, 100);

			return stream;
		},

		freshness(ctx) {
			ctx.meta.$responseHeaders = {
				"Last-Modified": "Mon, 06 Aug 2018 14:23:28 GMT"
			};
			return "fresh";
		},

		etag(ctx) {
			ctx.meta.$responseHeaders = {
				"ETag": "my custom etag"
			};
			return {};
		},

		error() {
			throw new MoleculerServerError("I'm dangerous", 500);
		},

		errorWithHeader(ctx) {
			ctx.meta.$responseType = "text/plain";
			ctx.meta.$responseHeaders = {
				"X-Custom-Header": "Custom content"
			};

			throw new MoleculerServerError("It is a wrong action! I always throw error!");
		},

		update: {
			rest: ["PUT /update", "PATCH /update"],
			params: {
				name: "string"
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		},
	}
};
