"use strict";

/**
 * This example demonstrates how to upload files to API Gateway
 *
 * Example:
 *
 *  - File upload:
 * 		Open https://localhost:4000/upload.html in the browser and upload a file. The file will be placed to the "examples/__uploads" folder.
 *
 *  - or upload file with cURL
 * 		curl -X PUT -H "Content-Type: image/png" --data-binary @test.png http://localhost:3000/upload
 *
 *  - or upload file with cURL and params
 * 		curl -X PUT -H "Content-Type: image/png" --data-binary @test.png http://localhost:3000/upload/d5a41a5b-28a8-4795-bc8a-e48dae5ebdb3
 */

const { ServiceBroker } = require("moleculer");

// ----

const ApiGatewayService = require("../../index");

// Create broker
const broker = new ServiceBroker({});

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,
	settings: {
		path: "/api",

		routes: [
			{
				path: "",

				// You should disable body parsers
				bodyParsers: {
					json: false,
					urlencoded: false,
					raw: {
						type: "*/*"
					}
				},

				mergeParams: false,

				aliases: {
					// File upload from HTML form
					"POST /raw": "echo.params",
				}
			}
		]
	}
});

broker.createService({
	name: "echo",
	actions: {
		params: {
			handler(ctx) {
				return {
					body: ctx.params.body.toString()
				};
			}
		}
	}
});

// Start server
broker.start();
