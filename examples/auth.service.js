/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const jwt 				= require("jsonwebtoken");
const _ 				= require("lodash");
const { CustomError } 	= require("moleculer").Errors;

const JWT_SECRET = "TOP SECRET!!!";

const users = [
	{ id: 1, username: "admin", password: "admin", role: "admin" },
	{ id: 2, username: "test", password: "test", role: "user" }
];

module.exports = {
	name: "auth",

	settings: {},

	actions: {
		login(ctx) {
			let user = users.find(u => u.username == ctx.params.username && u.password == ctx.params.password);

			if (user) {
				return this.generateToken(user).then(token => {
					return { token };
				});
			} else 
				return Promise.reject(new CustomError("Invalid credentials", 400));
		},

		verifyToken(ctx) {
			return this.verify(ctx.params.token, JWT_SECRET);
		},

		getUserByID(ctx) {
			return users.find(u => u.id == ctx.params.id);
		}
	},

	created() {
		this.encode = this.Promise.promisify(jwt.sign);
		this.verify = this.Promise.promisify(jwt.verify);
	},

	methods: {
		generateToken(user) {
			return this.encode(_.pick(user, ["id", "role"]), JWT_SECRET);
		}
	}
};