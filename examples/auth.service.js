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

	settings: {},

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
		login(ctx) {
			let user = users.find(u => u.username == ctx.params.username && u.password == ctx.params.password);

			if (user) {
				return this.generateToken(user).then(token => {
					return { token };
				});
			} else 
				return Promise.reject(new CustomError("Invalid credentials", 400));
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
		}
	},

	created() {
		// Create Promisify encode & verify methods
		this.encode = this.Promise.promisify(jwt.sign);
		this.verify = this.Promise.promisify(jwt.verify);
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