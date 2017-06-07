"use strict";

const _ = require("lodash");

module.exports = {
	name: "test",
	actions: {
		hello: {
			responseType: "text/plain",
			handler(ctx) {
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

		sayHi(ctx) {
			return "Hi!";
		}
	}
};
