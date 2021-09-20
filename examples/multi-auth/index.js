"use strict";

/**
 * This example shows how to define different authn/authz methods for different routes.
 *
 * Example:
 *
 *  - Try to call /aaa/hello. It will call "aaaAuthn" and "aaaAuthz" methods
 * 		http://localhost:3000/aaa/hello
 *
 *  - Try to call /bbb/hello. It will call "bbbAuthn" and "bbbAuthz" methods
 * 		http://localhost:3000/bbb/hello
 *
 *  - Try to call /ccc/hello. It will call "authenticate" and "authorize" original methods
 * 		http://localhost:3000/bbb/hello
 *
 */

let path 				= require("path");
let { ServiceBroker } 	= require("moleculer");
let ApiGatewayService 	= require("../../index");

const { UnAuthorizedError, ERR_NO_TOKEN, ERR_INVALID_TOKEN } = require("../../src/errors");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

// Load other services
broker.loadService(path.join(__dirname, "..", "test.service"));

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,

	settings: {

		routes: [
			{
				path: "/aaa",
				authentication: "aaaAuthn",
				authorization: "aaaAuthz",
				aliases: {
					"GET hello": "test.hello"
				}
			},
			{
				path: "/bbb",
				authentication: "bbbAuthn",
				authorization: "bbbAuthz",
				aliases: {
					"GET hello": "test.hello"
				}
			},
			{
				path: "/ccc",
				authentication: true,
				authorization: true,
				aliases: {
					"GET hello": "test.hello"
				}
			}
		]
	},

	methods: {
		aaaAuthz() {
			this.logger.info("Called 'aaaAuthz' method.");
		},
		bbbAuthz() {
			this.logger.info("Called 'bbbAuthz' method.");
		},
		authorize() {
			this.logger.info("Called original 'authorize' method.");
		}
	}
});

// Start server
broker.start();
