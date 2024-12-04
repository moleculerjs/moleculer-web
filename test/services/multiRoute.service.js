"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");

const { MoleculerServerError } = require("moleculer").Errors;

module.exports = {
	name: "multiRoute",

	settings: {
		rest: ["/route", "/route/multi"]
	},

	actions: {
		hello: {
			rest: "GET /hello",
			handler(ctx) {
				return "Hello Moleculer";
			}
		},

		greet: {
			rest: "/greet",
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
				fullPath: "/fullPath"
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

		update: {
			rest: ["PUT /update", "PATCH /update"],
			params: {
				name: "string"
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	}
};
