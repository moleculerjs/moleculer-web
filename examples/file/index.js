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
 */

const { ServiceBroker } = require("moleculer");

// ----

const ApiGatewayService = require("../../index");

// Create broker
const broker = new ServiceBroker({});

broker.loadService("./examples/file.service.js");

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,
	settings: {
		path: "/upload",

		routes: [
			{
				path: "",

				bodyParsers: {
					json: false,
					urlencoded: false
				},

				aliases: {
					"POST /": "multipart:file.save",
					"PUT /": "stream:file.save",
					"POST /multi": {
						type: "multipart",
						// Action level busboy config
						busboyConfig: {
							limits: {
								files: 3
							}
						},
						action: "file.save"
					}
				},

				// https://github.com/mscdex/busboy#busboy-methods
				busboyConfig: {
					limits: {
						files: 1
					}
				},

				callOptions: {
					meta: {
						a: 5
					}
				},

				mappingPolicy: "restrict"
			},

		],

		assets: {
			folder: "./examples/file/assets",
		}
	}
});

// Start server
broker.start();
