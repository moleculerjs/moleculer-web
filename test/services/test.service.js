"use strict";

const fs 		= require("fs");
const path 		= require("path");

const _ 		= require("lodash");

const { MoleculerServerError } = require("moleculer").Errors;

module.exports = {
	name: "test",
	actions: {
		hello(ctx) {
			return "Hello Moleculer";
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

		dangerZone: {
			publish: false,
			handler(ctx) {
				return "Danger zone!";
			}
		},

		text(ctx) {
			return "String text";
		},

		textPlain: {
			responseType: "text/plain",
			handler(ctx) {
				return "Plain text";
			}
		},

		number(ctx) {
			return 123;
		},

		numberPlain: {
			responseType: "text/plain",
			handler(ctx) {
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
			return () => {};
		},

		nothing(ctx) {},

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
			responseType: "application/json",
			handler(ctx) {
				return Buffer.from("{ \"a\": 5 }");
			}
		},

		stream() {
			const stream = fs.createReadStream(path.join(__dirname, "..", "assets", "lorem.txt"), "utf8");
			setTimeout(() => {
				stream.read(1024);
			}, 100);

			return stream;
		},

		streamWithError() {
			const stream = fs.createReadStream(path.join(__dirname, "..", "assets", "lorem.txt"), "utf8");
			setTimeout(() => {
				stream.emit("error", new MoleculerServerError("Something happened!"));
			}, 100);

			return stream;
		},

		error() {
			throw new MoleculerServerError("I'm dangerous", 505);
		}
	}
};
