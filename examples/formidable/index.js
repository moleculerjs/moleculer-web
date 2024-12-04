"use strict";

/**
 * This example demonstrates how to upload files to API Gateway with Formidable
 *
 * Example:
 *
 *  - File upload:
 * 		Open http://localhost:3000 in the browser and upload a file. The file will be placed to the "examples/__uploads" folder.
 *
 *  - or upload file with cURL
 * 		curl -X PUT -H "Content-Type: image/png" --data-binary @test.png http://localhost:3000/upload
 *
 *  - or upload file with cURL and params
 * 		curl -X PUT -H "Content-Type: image/png" --data-binary @test.png http://localhost:3000/upload/d5a41a5b-28a8-4795-bc8a-e48dae5ebdb3
 */

const fs = require("fs");
const { ServiceBroker } = require("moleculer");
const formidable = require("formidable");

// ----

const ApiGatewayService = require("../../index");

// Create broker
const broker = new ServiceBroker({});

broker.loadService("./examples/file.service.js");

// Load API Gateway
broker.createService({
	mixins: [ApiGatewayService],
	settings: {
		path: "/upload",

		routes: [
			{
				path: "",

				// You should disable body parsers
				bodyParsers: {
					json: false,
					urlencoded: false
				},

				aliases: {
					"GET /:file": "file.get",

					// File upload from AJAX or cURL
					"PUT /": "stream:file.save",

					// File upload from AJAX or cURL with params
					"PUT /:id": "stream:file.save",

					"POST /single/:id"(req, res) {
						return this.handleFileUpload(req, res);
					},

					// File upload from HTML form
					"POST /multi"(req, res) {
						return this.handleFileUpload(req, res);
					}
				},

				callOptions: {
					meta: {
						a: 5
					}
				},

				mappingPolicy: "restrict"
			}
		],

		assets: {
			folder: "./examples/formidable/assets"
		}
	},

	methods: {
		handleFileUpload(req, res) {
			// parse a file upload
			const form = formidable({ multiples: true });

			form.parse(req, async (err, fields, files) => {
				if (err) {
					this.logger.error(err);
					return this.sendError(req, res, err);
				}

				const ctx = req.$ctx;
				const entries = Array.isArray(files.myfile) ? files.myfile : [files.myfile];
				const result = await Promise.all(
					entries.map(entry => {
						return ctx.call(
							"file.save",
							{
								$filename: entry.name,
								...req.params,
								...fields
							},
							{ stream: fs.createReadStream(entry.path) }
						);
					})
				);

				return this.sendResponse(
					req,
					res,
					Array.isArray(files.myfile) ? result : result[0]
				);
			});
		}
	}
});

// Start server
broker.start();
