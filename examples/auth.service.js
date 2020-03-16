/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const jwt 					= require("jsonwebtoken");
const _ 					= require("lodash");
const { MoleculerError } 	= require("moleculer").Errors;
const { promisify }			= require("util");

const JWT_SECRET = "TOP SECRET!!!";

// Fake user DB
const users = [
	{ id: 1, username: "admin", password: "admin", role: "admin" },
	{ id: 2, username: "test", password: "test", role: "user" }
];

/**
 * Authentication & Authorization service
 */
module.exports = {
	name: "auth",

	actions: {
		/**
		 * Login action.
		 *
		 * Required params:
		 * 	- 'username'
		 *  - 'password'
		 *
		 * @param {any} ctx
		 * @returns
		 */
		login: {
			rest: "/login",
			handler(ctx) {
				let user = users.find(u => u.username == ctx.params.username && u.password == ctx.params.password);

				if (user) {
					return this.generateToken(user).then(token => {
						return { token };
					});
				} else
					return Promise.reject(new MoleculerError("Invalid credentials", 400));
			}
		},

		/**
		 * Verify a JWT token
		 *
		 * @param {any} ctx
		 * @returns
		 */
		verifyToken(ctx) {
			return this.verify(ctx.params.token, JWT_SECRET);
		},

		/**
		 * Get User entity by ID
		 *
		 * @param {any} ctx
		 * @returns
		 */
		getUserByID(ctx) {
			return users.find(u => u.id == ctx.params.id);
		},

		resolveToken: {
			cache: {
				keys: ["token"],
				ttl: 60 * 60 // 1 hour
			},
			params: {
				token: "string"
			},
			handler(ctx) {
				return new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, JWT_SECRET, (err, decoded) => {
						if (err) {
							return reject(err);
						}
						resolve(decoded);
					});
				}).then(decoded => {
					if (decoded.id) {
						return users.find(u => u.id == decoded.id);
					}
				});
			}
		},
	},

	created() {
		// Create Promisify encode & verify methods
		this.encode = promisify(jwt.sign);
		this.verify = promisify(jwt.verify);
	},

	methods: {
		/**
		 * Generate JWT token
		 *
		 * @param {any} user
		 * @returns
		 */
		generateToken(user) {
			return this.encode(_.pick(user, ["id", "role"]), JWT_SECRET);
		}
	}
};
