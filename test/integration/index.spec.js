"use strict";

process.env.PORT = 0; // Use random ports

const _ = require("lodash");
const fs = require("fs");
const http = require("http");
const path = require("path");
const request = require("supertest");
const express = require("express");
const lolex = require("lolex");
const crypto = require("crypto");
const ApiGateway = require("../../index");
const { ServiceBroker, Context } = require("moleculer");
const { MoleculerError } = require("moleculer").Errors;
const { UnAuthorizedError, ERR_NO_TOKEN } = ApiGateway.Errors;
const Busboy = require("busboy");
const Alias = require("../../src/alias");

/*
setTimeout(() => {
	const util = require("util");
	fs.writeFileSync("d:\\handlers.json", util.inspect(process._getActiveHandles()));
	fs.writeFileSync("d:\\requests.json", util.inspect(process._getActiveRequests()));
	//console.log(process._getActiveHandles());
	//console.log(process._getActiveRequests());
}, 10 * 1000).unref();*/

function setup(settings, brokerSettings = {}) {
	const broker = new ServiceBroker(Object.assign({}, { nodeID: undefined, logger: false }, brokerSettings));
	broker.loadService("./test/services/test.service");

	const service = broker.createService(_.cloneDeep(ApiGateway), {
		settings
	});
	const server = service.server;

	return [broker, service, server];
}

describe("Test default settings", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup();
		return broker.start();
	});

	afterAll(() => broker.stop());

	it("GET /", () => {
		return request(server)
			.get("/")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("GET /other/action", () => {
		return request(server)
			.get("/other/action")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Service 'other.action' is not found.",
					"name": "ServiceNotFoundError",
					"type": "SERVICE_NOT_FOUND",
					"data": {
						action: "other.action"
					}
				});
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /test/greeter", () => {
		return request(server)
			.get("/test/greeter")
			.query({ name: "John" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello John");
			});
	});

	it("POST /test/greeter with query", () => {
		return request(server)
			.post("/test/greeter")
			.query({ name: "John" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello John");
			});
	});

	it("POST /test/greeter with body", () => {
		return request(server)
			.post("/test/greeter")
			.send({ name: "Adam" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Adam");
			});
	});

	it("POST /test/greeter with query & body", () => {
		return request(server)
			.post("/test/greeter")
			.query({ name: "John" })
			.send({ name: "Adam" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello John");
			});
	});

	it("GET /test/dangerZone", () => {
		return request(server)
			.get("/test/dangerZone")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					code: 404,
					message: "Service 'test.dangerZone' is not found.",
					name: "ServiceNotFoundError",
					type: "SERVICE_NOT_FOUND",
					data: {
						action: "test.dangerZone"
					}
				});
			});
	});
});

describe("Test responses", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {

		[broker, service, server] = setup({
			routes: [{
				camelCaseNames: true
			}]
		}, { metrics: true });

		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /test/text with 'text/plain'", () => {
		return request(server)
			.get("/test/text")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.header["x-request-id"]).toBeDefined();
				expect(res.body).toEqual("String text");
			});
	});

	it("GET /test/textPlain with 'text/plain'", () => {
		return request(server)
			.get("/test/textPlain")
			.set("X-Request-Id", "abcd1234")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/plain");
				expect(res.header["x-request-id"]).toBe("abcd1234");
				expect(res.text).toEqual("Plain text");
			});
	});

	it("GET /test/text-plain with 'text/plain'", () => {
		return request(server)
			.get("/test/text-plain")
			.set("X-Correlation-Id", "abcd1234")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/plain");
				expect(res.header["x-request-id"]).toBe("abcd1234");
				expect(res.text).toEqual("Plain text");
			});
	});

	it("GET /test/number", () => {
		return request(server)
			.get("/test/number")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual(123);
			});
	});

	it("GET /test/numberPlain", () => {
		return request(server)
			.get("/test/numberPlain")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/plain");
				expect(res.text).toEqual("123");
			});
	});

	it("GET /test/boolean", () => {
		return request(server)
			.get("/test/boolean")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual(true);
			});
	});

	it("GET /test/json", () => {
		return request(server)
			.get("/test/json")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ id: 1, name: "Eddie" });
			});
	});

	it("GET /test/jsonArray", () => {
		return request(server)
			.get("/test/jsonArray")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual([
					{ id: 1, name: "John" },
					{ id: 2, name: "Jane" }
				]);
			});
	});

	it("GET /test/buffer", () => {
		return request(server)
			.get("/test/buffer")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/octet-stream");
				expect(res.headers["content-length"]).toBe("15");
				expect(Buffer.from(res.body).toString("utf8")).toEqual("Buffer response");
			});
	});

	it("GET /test/bufferObj", () => {
		return request(server)
			.get("/test/bufferObj")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/octet-stream");
				expect(res.headers["content-length"]).toBe("22");
				expect(Buffer.from(res.body).toString("utf8")).toEqual("Buffer object response");
			});
	});

	it("GET /test/bufferJson", () => {
		return request(server)
			.get("/test/bufferJson")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json");
				expect(res.headers["content-length"]).toBe("10");
				expect(res.body).toEqual({ a: 5 });
			});
	});

	it("GET /test/customHeader", () => {
		return request(server)
			.get("/test/customHeader")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/plain");
				expect(res.headers["x-custom-header"]).toBe("working");
				expect(res.text).toEqual("CustomHeader");
			});
	});

	it("GET /test/customStatus", () => {
		return request(server)
			.get("/test/customStatus")
			.then(res => {
				expect(res.statusCode).toBe(201);
				expect(res.res.statusMessage).toEqual("Entity created");
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/redirect", () => {
		return request(server)
			.get("/test/redirect")
			.then(res => {
				expect(res.statusCode).toBe(302);
				expect(res.headers["location"]).toBe("/test/hello");
				expect(res.res.statusMessage).toEqual("Redirecting...");
				expect(res.body).toEqual("REDIRECT");
			});
	});

	it("GET /test/stream", () => {
		return request(server)
			.get("/test/stream")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/octet-stream");
				expect(res.headers["content-disposition"]).toBe("attachment; filename=\"stream-lorem.txt\"");
				expect(Buffer.from(res.body).toString("utf8")).toEqual("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in faucibus sapien, vitae aliquet nisi. Vivamus quis finibus tortor.");
			});
	});

	/*it("GET /test/streamWithError", () => {
		return request(server)
			.get("/test/streamWithError")
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 500,
					"message": "Something happened!",
					"name": "CustomError"
				});
			});
	});*/

	it("GET /test/nothing", () => {
		return request(server)
			.get("/test/nothing")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/null", () => {
		return request(server)
			.get("/test/null")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/function", () => {
		return request(server)
			.get("/test/function")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/error", () => {
		return request(server)
			.get("/test/error")
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.header["x-request-id"]).toBeDefined();
				expect(res.body).toEqual({
					"code": 500,
					"message": "I'm dangerous",
					"name": "MoleculerServerError"
				});
			});
	});

	it("GET /test/errorWithHeader", () => {
		return request(server)
			.get("/test/errorWithHeader")
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.headers["content-type"]).toBe("text/plain");
				expect(res.header["x-request-id"]).toBeDefined();
				expect(res.header["x-custom-header"]).toBe("Custom content");
				expect(res.text).toBe("{\"name\":\"MoleculerServerError\",\"message\":\"It is a wrong action! I always throw error!\",\"code\":500}");
			});
	});
});

describe("Test with `path` prefix", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			path: "/my-api"
		});
		//broker.loadService("./test/services/math.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /", () => {
		return request(server)
			.get("/")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("GET /my-api/test/hello", () => {
		return request(server)
			.get("/my-api/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

});

describe("Test with `/` path prefix", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			path: "/"
		});
		//broker.loadService("./test/services/math.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /", () => {
		return request(server)
			.get("/")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

});

describe("Test only assets", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			assets: {
				folder: path.join(__dirname, "..", "assets")
			},
			routes: null
		});
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /", () => {
		return request(server)
			.get("/")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/html; charset=UTF-8");
				expect(res.text).toBe(fs.readFileSync(path.join(__dirname, "..", "assets", "index.html"), "utf8"));
			});
	});

	it("GET /lorem.txt", () => {
		return request(server)
			.get("/lorem.txt")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/plain; charset=UTF-8");
				expect(res.text).toBe("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in faucibus sapien, vitae aliquet nisi. Vivamus quis finibus tortor.");
			});
	});

	it("GET /test/welcome", () => {
		return request(server)
			.get("/test/welcome")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});

	});

});

describe("Test assets & API route", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			assets: {
				folder: path.join(__dirname, "..", "assets")
			},
			routes: [{
				path: "/api"
			}]
		});
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /", () => {
		return request(server)
			.get("/")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/html; charset=UTF-8");
				expect(res.text).toBe(fs.readFileSync(path.join(__dirname, "..", "assets", "index.html"), "utf8"));
			});
	});

	it("GET /lorem.txt", () => {
		return request(server)
			.get("/lorem.txt")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("text/plain; charset=UTF-8");
				expect(res.text).toBe("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in faucibus sapien, vitae aliquet nisi. Vivamus quis finibus tortor.");
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/api/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /test/hello file content", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/octet-stream");
				expect(res.body).toEqual(Buffer.from("Hello file content\n"));
			});
	});

});

describe("Test whitelist", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				whitelist: [
					"test.hello",
					"math.*",
					/^test\.json/
				]
			}]
		});

		broker.loadService("./test/services/math.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api/test/hello", () => {
		return request(server)
			.get("/api/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api/test/json", () => {
		return request(server)
			.get("/api/test/json")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ id: 1, name: "Eddie" });
			});
	});

	it("GET /api/test/jsonArray", () => {
		return request(server)
			.get("/api/test/jsonArray")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual([
					{ id: 1, name: "John" },
					{ id: 2, name: "Jane" },
				]);
			});
	});

	it("GET /api/test/greeter", () => {
		return request(server)
			.get("/api/test/greeter")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					code: 404,
					message: "Service 'test.greeter' is not found.",
					name: "ServiceNotFoundError",
					type: "SERVICE_NOT_FOUND",
					data: {
						action: "test.greeter"
					}
				});
			});
	});

	it("GET /api/math.add", () => {
		return request(server)
			.get("/api/math.add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("GET /api/math.sub", () => {
		return request(server)
			.get("/api/math.sub")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(-3);
			});
	});
});

describe("Test aliases", () => {
	let broker;
	let service;
	let server;

	let customAlias = jest.fn((req, res) => {
		expect(req.$route).toBeDefined();
		expect(req.$service).toBe(service);
		expect(req.$params).toEqual({
			name: "Ben"
		});

		expect(res.$ctx).toBeDefined();
		expect(res.$route).toBeDefined();
		expect(res.$service).toBe(service);

		res.end(`Custom Alias by ${req.$params.name}`);
	});

	let customMiddlewares = [
		jest.fn((req, res, next) => next()),
		jest.fn((req, res, next) => next()),
		"test.greeter"
	];

	let throwMiddleware = jest.fn((req, res, next) => next(new MoleculerError("Some error")));

	let errorHandlerMiddleware = jest.fn((err, req, res, next) => {
		res.end("Error is handled");
	});

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [
				{
					path: "/api",
					aliases: {
						"add": "math.add",
						"GET hello": "test.hello",
						"POST   /hello": "test.greeter",
						"GET 	greeter/:name": "test.greeter",
						"POST 	greeting/:name": "test.greeter",
						"opt-test/:name?": "test.echo",
						"/repeat-test/:args*": "test.echo",
						"GET /": "test.hello",
						"GET custom": customAlias,
						"GET /middleware": customMiddlewares,
						"GET /wrong-middleware": [customMiddlewares[0], customMiddlewares[1]],
						"GET /error-middleware": [customMiddlewares[0], customMiddlewares[1], throwMiddleware],
						"GET /error-handled-middleware": [customMiddlewares[0], customMiddlewares[1], throwMiddleware, errorHandlerMiddleware],
						"GET reqres": {
							action: "test.reqres",
							passReqResToParams: true
						},
					}
				},
				{
					path: "/unsecure",
				}
			]
		});

		broker.loadService("./test/services/math.service");
		return broker.start();
	});

	afterAll(() => broker.stop());


	it("GET /unsecure/math.add", () => {
		return request(server)
			.get("/unsecure/math.add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("GET /api/math.add", () => {
		return request(server)
			.get("/api/math.add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"name": "NotFoundError",
					"message": "Not found",
					"code": 404,
					"type": "NOT_FOUND",
				});
			});
	});

	it("GET /api/add", () => {
		return request(server)
			.get("/api/add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("POST /api/add", () => {
		return request(server)
			.post("/api/add")
			.send({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("GET /unsecure/test/hello", () => {
		return request(server)
			.get("/unsecure/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api/hello", () => {
		return request(server)
			.get("/api/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("POST /api/hello", () => {
		return request(server)
			.post("/api/hello")
			.query({ name: "Ben" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Ben");
			});
	});

	it("GET /api/greeter/Norbert", () => {
		return request(server)
			.get("/api/greeter/Norbert")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Norbert");
			});
	});

	it("GET /api/greeter/~Tilde~", () => {
		return request(server)
			.get("/api/greeter/~Tilde~")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello ~Tilde~");
			});
	});

	it("GET /unsecure/~node/health", () => {
		return request(server)
			.get("/unsecure/~node/health")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
			});
	});

	it("POST /api/greeter/Norbert", () => {
		return request(server)
			.post("/api/greeter/Norbert")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"name": "NotFoundError",
					"message": "Not found",
					"code": 404,
					"type": "NOT_FOUND"
				});
			});
	});

	it("POST /api/greeting/Norbert", () => {
		return request(server)
			.post("/api/greeting/Norbert")
			.query({ name: "John" })
			.send({ name: "Adam" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Norbert");
			});
	});

	it("GET opt-test/:name? with name", () => {
		return request(server)
			.get("/api/opt-test/John")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					name: "John"
				});
			});
	});

	it("GET opt-test with array params", () => {
		return request(server)
			.get("/api/opt-test")
			.query("a=1&a=2")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					a: ["1", "2"],
				});
			});
	});

	it("GET opt-test with nested params", () => {
		return request(server)
			.get("/api/opt-test")
			.query("foo[bar]=a&foo[bar]=b&foo[baz]=c")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					foo: { bar: ["a", "b"], baz: "c" }
				});
			});
	});

	it("GET opt-test/:name? without name", () => {
		return request(server)
			.get("/api/opt-test")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({});
			});
	});

	it("GET repeat-test/:args?", () => {
		return request(server)
			.get("/api/repeat-test/John/Jane/Adam/Walter")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					args: ["John", "Jane", "Adam", "Walter"]
				});
			});
	});

	it("GET /api/", () => {
		return request(server)
			.get("/api")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api/custom", () => {
		return request(server)
			.get("/api/custom")
			.query({ name: "Ben" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toBe("Custom Alias by Ben");
				expect(customAlias).toHaveBeenCalledTimes(1);
				expect(customAlias).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));
			});
	});

	it("GET /api/middleware", () => {
		return request(server)
			.get("/api/middleware")
			.query({ name: "Ben" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.body).toBe("Hello Ben");

				expect(customMiddlewares[0]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[0]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(customMiddlewares[1]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[1]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(customMiddlewares[0].mock.calls[0][0].url).toBe("/middleware?name=Ben");
				expect(customMiddlewares[0].mock.calls[0][0].originalUrl).toBe("/api/middleware?name=Ben");
				expect(customMiddlewares[0].mock.calls[0][0].baseUrl).toBe("/api");
			});
	});

	it("GET /api/wrong-middleware", () => {
		customMiddlewares[0].mockClear();
		customMiddlewares[1].mockClear();

		return request(server)
			.get("/api/wrong-middleware")
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.body).toEqual({
					"name": "MoleculerServerError",
					"message": "No alias handler",
					"code": 500,
					"type": "NO_ALIAS_HANDLER",
					"data": {
						"path": "/api/wrong-middleware",
						"alias": {
							"method": "GET",
							"path": "wrong-middleware"
						}
					}
				});

				expect(customMiddlewares[0]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[0]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(customMiddlewares[1]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[1]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));
			});
	});


	it("GET /api/error-middleware", () => {
		customMiddlewares[0].mockClear();
		customMiddlewares[1].mockClear();
		throwMiddleware.mockClear();

		return request(server)
			.get("/api/error-middleware")
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.body).toEqual({
					"name": "MoleculerError",
					"message": "Some error",
					"code": 500
				});

				expect(customMiddlewares[0]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[0]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(customMiddlewares[1]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[1]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(throwMiddleware).toHaveBeenCalledTimes(1);
				expect(throwMiddleware).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));
			});
	});

	it("GET /api/error-handled-middleware", () => {
		customMiddlewares[0].mockClear();
		customMiddlewares[1].mockClear();
		throwMiddleware.mockClear();
		errorHandlerMiddleware.mockClear();

		return request(server)
			.get("/api/error-handled-middleware")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toEqual("Error is handled");

				expect(customMiddlewares[0]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[0]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(customMiddlewares[1]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[1]).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(throwMiddleware).toHaveBeenCalledTimes(1);
				expect(throwMiddleware).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(errorHandlerMiddleware).toHaveBeenCalledTimes(1);
				expect(errorHandlerMiddleware).toHaveBeenCalledWith(expect.any(MoleculerError), expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));
			});
	});

	it("GET /api/reqres with name", () => {
		return request(server)
			.get("/api/reqres")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					hasReq: true,
					hasRes: true
				});
			});
	});
});

describe("Test un-merged params", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				mergeParams: false,
				aliases: {
					"GET echo": "test.echo",
					"POST /echo": "test.echo",
					"param-test/:name": "test.echo",
					"opt-test/:name?": "test.echo",
					"repeat-test/:args*": "test.echo",
				}
			}]
		});
		return broker.start();
	});

	afterAll(() => broker.stop());

	it("GET /api/echo", () => {
		return request(server)
			.get("/api/echo")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {},
					query: {}
				});
			});
	});

	it("GET /api/echo?a=5&b=8", () => {
		return request(server)
			.get("/api/echo")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {},
					query: {
						a: "5",
						b: "8"
					}
				});
			});
	});

	it("POST /api/echo", () => {
		return request(server)
			.post("/api/echo")
			.send({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {
						a: 5,
						b: 8
					},
					params: {},
					query: {}
				});
			});
	});

	it("POST /api/echo?a=5&b=8", () => {
		return request(server)
			.post("/api/echo")
			.query({ a: 5, b: 8 })
			.send({ a: 10, b: 20 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {
						a: 10,
						b: 20
					},
					params: {},
					query: {
						a: "5",
						b: "8"
					}
				});
			});
	});

	it("GET opt-test/:name? with name", () => {
		return request(server)
			.get("/api/opt-test/John")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {
						name: "John"
					},
					query: {}
				});
			});
	});

	it("GET opt-test with array params", () => {
		return request(server)
			.get("/api/opt-test")
			.query("a=1&a=2")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {},
					query: {
						a: ["1", "2"]
					}
				});
			});
	});

	it("GET opt-test with nested params", () => {
		return request(server)
			.get("/api/opt-test")
			.query("foo[bar]=a&foo[bar]=b&foo[baz]=c")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {},
					query: {
						foo: { bar: ["a", "b"], baz: "c" }
					}
				});
			});
	});

	it("GET opt-test/:name? without name", () => {
		return request(server)
			.get("/api/opt-test")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {},
					query: {}
				});
			});
	});

	it("GET repeat-test/:args?", () => {
		return request(server)
			.get("/api/repeat-test/John/Jane/Adam/Walter")
			.query("foo[bar]=a&foo[bar]=b&foo[baz]=c")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.params).toEqual({
					body: {},
					params: {
						args: ["John", "Jane", "Adam", "Walter"]
					},
					query: {
						foo: { bar: ["a", "b"], baz: "c" }
					}
				});
			});
	});
});

describe("Test REST shorthand aliases", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				aliases: {
					"REST posts": "posts"
				}
			}]
		});

		broker.loadService("./test/services/posts.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api/posts", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.length).toBe(5);
			});
	});


	it("GET /api/posts/2", () => {
		return request(server)
			.get("/api/posts/2")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBeInstanceOf(Object);
				expect(res.body.title).toBeDefined();
				expect(res.body.id).toBe(2);
			});
	});

	it("POST /api/posts", () => {
		return request(server)
			.post("/api/posts")
			.send({ id: 8, title: "Test", content: "Content" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Test");
				expect(res.body.content).toBe("Content");
			});
	});

	it("PUT /api/posts/8", () => {
		return request(server)
			.put("/api/posts/8")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Modified");
				expect(res.body.content).toBe("Content");
			});
	});

	it("PATCH /api/posts/8", () => {
		return request(server)
			.patch("/api/posts/8")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Modified");
				expect(res.body.content).toBe("Content");
			});
	});

	it("GET /api/posts/8", () => {
		return request(server)
			.get("/api/posts/8")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Modified");
				expect(res.body.content).toBe("Content");
			});
	});

	it("DELETE /api/posts/8", () => {
		return request(server)
			.delete("/api/posts/8")
			.then(res => {
				expect(res.statusCode).toBe(200);
			});
	});

	it("GET /api/posts/8", () => {
		return request(server)
			.get("/api/posts/8")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

});

describe("Test REST shorthand aliases and only filter", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				aliases: {
					"REST posts": {
						action: "posts",
						only: ["list", "get"]
					}
				}
			}]
		});

		broker.loadService("./test/services/posts.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api/posts", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.length).toBe(5);
			});
	});

	it("GET /api/posts/2", () => {
		return request(server)
			.get("/api/posts/2")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBeInstanceOf(Object);
				expect(res.body.title).toBeDefined();
				expect(res.body.id).toBe(2);
			});
	});

	it("POST /api/posts", () => {
		return request(server)
			.post("/api/posts")
			.send({ id: 8, title: "Test", content: "Content" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("PUT /api/posts/8", () => {
		return request(server)
			.put("/api/posts/8")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("PATCH /api/posts/8", () => {
		return request(server)
			.patch("/api/posts/8")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("DELETE /api/posts/8", () => {
		return request(server)
			.delete("/api/posts/8")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});
});

describe("Test REST shorthand aliases and except filter", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				aliases: {
					"REST posts": {
						action: "posts",
						except: ["list", "get", "update", "remove"]
					}
				}
			}]
		});

		broker.loadService("./test/services/posts.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api/posts", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("GET /api/posts/2", () => {
		return request(server)
			.get("/api/posts/2")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("POST /api/posts", () => {
		return request(server)
			.post("/api/posts")
			.send({ id: 10, title: "Test", content: "Content" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.id).toBe(10);
				expect(res.body.title).toBe("Test");
				expect(res.body.content).toBe("Content");
			});
	});

	it("PUT /api/posts/10", () => {
		return request(server)
			.put("/api/posts/10")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("PATCH /api/posts/10", () => {
		return request(server)
			.patch("/api/posts/10")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.id).toBe(10);
				expect(res.body.title).toBe("Modified");
				expect(res.body.content).toBe("Content");
			});
	});

	it("DELETE /api/posts/10", () => {
		return request(server)
			.delete("/api/posts/10")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});
});

describe("Test REST shorthand aliases and only, execpt filter", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				aliases: {
					"REST posts": {
						action: "posts",
						only: ["list", "get"],
						except: ["list"]
					}
				}
			}]
		});

		broker.loadService("./test/services/posts.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api/posts", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("GET /api/posts/2", () => {
		return request(server)
			.get("/api/posts/2")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBeInstanceOf(Object);
				expect(res.body.title).toBeDefined();
				expect(res.body.id).toBe(2);
			});
	});

	it("POST /api/posts", () => {
		return request(server)
			.post("/api/posts")
			.send({ id: 12, title: "Test", content: "Content" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("PUT /api/posts/2", () => {
		return request(server)
			.put("/api/posts/2")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("PATCH /api/posts/2", () => {
		return request(server)
			.patch("/api/posts/2")
			.send({ title: "Modified" })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("DELETE /api/posts/2", () => {
		return request(server)
			.delete("/api/posts/2")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});
});

describe("Test alias & whitelist", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/api",
				whitelist: [
					"math.*"
				],
				aliases: {
					"add": "math.add",
					"hello": "test.hello",
					"mw-hello": [
						(req, res, next) => next(),
						(req, res, next) => next(),
						"test.hello",
					]
				}
			}]
		});

		broker.loadService("./test/services/math.service");
		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api/add", () => {
		return request(server)
			.get("/api/add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("GET /api/hello", () => {
		return request(server)
			.get("/api/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					code: 404,
					message: "Service 'test.hello' is not found.",
					name: "ServiceNotFoundError",
					type: "SERVICE_NOT_FOUND",
					data: {
						action: "test.hello"
					}
				});
			});
	});

	it("GET /api/mw-hello", () => {
		return request(server)
			.get("/api/mw-hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					code: 404,
					message: "Service 'test.hello' is not found.",
					name: "ServiceNotFoundError",
					type: "SERVICE_NOT_FOUND",
					data: {
						action: "test.hello"
					}
				});
			});
	});

});

describe("Test body-parsers", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
	});

	describe("JSON parser should be set to default", () => {
		it("When its value is null / undefined", () => {
			[broker, service, server] = setup({
				routes: [{}]
			});

			expect(Array.isArray(service.routes) && service.routes.length === 1).toBeTruthy();
			const middlewares = service.routes[0].middlewares;
			expect(Array.isArray(middlewares) && middlewares.length === 1).toBeTruthy();
			expect(typeof middlewares[0] === "function" && middlewares[0].name === "jsonParser").toBeTruthy();
		});

		it("When its value is true", () => {
			[broker, service, server] = setup({
				routes: [{
					"bodyParsers": true
				}]
			});

			expect(Array.isArray(service.routes) && service.routes.length === 1).toBeTruthy();
			const middlewares = service.routes[0].middlewares;
			expect(Array.isArray(middlewares) && middlewares.length === 1).toBeTruthy();
			expect(typeof middlewares[0] === "function" && middlewares[0].name === "jsonParser").toBeTruthy();
		});

		it("But not truly", () => {
			[broker, service, server] = setup({
				routes: [{
					"bodyParsers": 1
				}]
			});

			expect(Array.isArray(service.routes) && service.routes.length === 1).toBeTruthy();
			const middlewares = service.routes[0].middlewares;
			expect(Array.isArray(middlewares) && middlewares.length === 0).toBeTruthy();
		});
	});

	it("POST /api/test.gretter without bodyParsers", () => {
		[broker, service, server] = setup({
			routes: [{
				bodyParsers: false
			}]
		});

		return broker.start()
			.then(() => request(server)
				.post("/test.greeter")
				.send({ name: "John" }))
			.then(res => {
				expect(res.statusCode).toBe(422);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 422,
					"data": [{
						"field": "name",
						"message": "The 'name' field is required.",
						"type": "required",
						"action": "test.greeter",
						"nodeID": broker.nodeID
					}],
					"message": "Parameters validation error!",
					"name": "ValidationError",
					"type": "VALIDATION_ERROR"
				});
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("POST /api/test.gretter with JSON parser", () => {
		[broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					json: true
				}
			}]
		});

		return broker.start()
			.then(() => request(server)
				.post("/test.greeter")
				.send({ name: "John" }))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello John");
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("POST /api/test.gretter with JSON parser & invalid JSON", () => {
		[broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					json: true
				}
			}]
		});

		return broker.start()
			.then(() => request(server)
				.post("/test.greeter")
				.set("Content-Type", "application/json; charset=utf-8")
				.send("invalid"))
			.then(res => {
				expect(res.statusCode).toBe(400);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 400,
					"type": "entity.parse.failed",
					"message": "Unexpected token i in JSON at position 0",
					"name": "MoleculerError"
				});
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});


	it("POST /api/test.gretter with JSON parser & urlEncoded body", () => {
		[broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					json: true
				}
			}]
		});

		return broker.start()
			.then(() => request(server)
				.post("/test.greeter")
				.set("Content-Type", "application/x-www-form-urlencoded")
				.send({ name: "Bill" }))
			.then(res => {
				expect(res.statusCode).toBe(422);
			})
			.then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("POST /api/test.gretter with urlencoder parser", () => {
		[broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					urlencoded: { extended: true }
				}
			}]
		});

		return broker.start()
			.then(() => request(server)
				.post("/test.greeter")
				.set("Content-Type", "application/x-www-form-urlencoded")
				.send({ name: "Adam" }))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Adam");
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});
});

describe("Test multiple routes", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [
				{
					path: "/api1",
					whitelist: [
						"math.*"
					],
					aliases: {
						"main": "math.add"
					},
					mappingPolicy: "all"
				},
				{
					path: "/api2",
					whitelist: [
						"test.*"
					],
					aliases: {
						"main": "test.greeter"
					},
					mappingPolicy: "all"
				}
			]
		});

		broker.loadService("./test/services/math.service");

		return broker.start();
	});
	afterAll(() => broker.stop());

	it("GET /api1/test/hello", () => {
		return request(server)
			.get("/api1/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("GET /api2/test/hello", () => {
		return request(server)
			.get("/api2/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api1/math.add", () => {
		return request(server)
			.get("/api1/math.add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("GET /api2/math.add", () => {
		return request(server)
			.get("/api2/math.add")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});

	it("GET /api1/main", () => {
		return request(server)
			.get("/api1/main")
			.query({ a: 5, b: 8 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe(13);
			});
	});

	it("GET /api2/main", () => {
		return request(server)
			.get("/api2/main")
			.query({ name: "Thomas" })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Thomas");
			});
	});
});

describe("Test mappingPolicy route option", () => {
	let broker;
	let service;
	let server;

	describe("'all' option", () => {
		beforeAll(() => {
			[broker, service, server] = setup({
				routes: [
					{
						path: "/api",
						whitelist: [
							"math.*"
						],
						aliases: {
							"add": "math.add"
						},
						mappingPolicy: "all"
					}
				]
			});

			broker.loadService("./test/services/math.service");
			return broker.start();
		});
		afterAll(() => broker.stop());

		it("GET /api/math.add", () => {
			return request(server)
				.get("/api/math.add")
				.query({ a: 5, b: 8 })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
					expect(res.body).toBe(13);
				});
		});

		it("GET /api/math/add", () => {
			return request(server)
				.get("/api/math/add")
				.query({ a: 5, b: 8 })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
					expect(res.body).toBe(13);
				});
		});

		it("GET /api/add", () => {
			return request(server)
				.get("/api/add")
				.query({ a: 5, b: 8 })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
					expect(res.body).toBe(13);
				});
		});
	});

	describe("'restrict' option", () => {
		beforeAll(() => {
			[broker, service, server] = setup({
				routes: [
					{
						path: "/api",
						whitelist: [
							"math.*"
						],
						aliases: {
							"add": "math.add"
						},
						mappingPolicy: "restrict"
					}
				]
			});

			broker.loadService("./test/services/math.service");
			return broker.start();
		});
		afterAll(() => broker.stop());

		it("GET /api/math.add", () => {
			return request(server)
				.get("/api/math.add")
				.then(res => {
					expect(res.statusCode).toBe(404);
				});
		});

		it("GET /api/math/add", () => {
			return request(server)
				.get("/api/math/add")
				.then(res => {
					expect(res.statusCode).toBe(404);
				});
		});

		it("GET /api/add", () => {
			return request(server)
				.get("/api/add")
				.query({ a: 5, b: 8 })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
					expect(res.body).toBe(13);
				});
		});
	});

	describe("'restrict' option without aliases", () => {
		beforeAll(() => {
			[broker, service, server] = setup({
				routes: [
					{
						path: "/",
						mappingPolicy: "restrict"
					}
				]
			});

			broker.loadService("./test/services/math.service");
			return broker.start();
		});
		afterAll(() => broker.stop());

		it("GET /test", () => {
			return request(server)
				.get("/test")
				.then(res => {
					expect(res.statusCode).toBe(404);
				});
		});

		it("GET /math/add", () => {
			return request(server)
				.get("/math/add")
				.then(res => {
					expect(res.statusCode).toBe(404);
				});
		});

	});
});

describe("Test CORS", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
	});

	it("no errors if missing origin header", () => {
		[broker, service, server] = setup({
			cors: {}
		});
		return broker.start()
			.then(() => request(server)
				.get("/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.body).toEqual("Hello Moleculer");
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	// breaking change /!\ default is super secure now. no cors means... no cors.
	it("with default settings", () => {
		[broker, service, server] = setup({
			cors: {},
		});

		return broker
			.start()
			.then(() =>
				request(server)
					.get("/test/hello")
					.set("Origin", "http://localhost:3000")
			)
			.then((res) => {
				expect(res.statusCode).toBe(403);
				expect(res.body).toEqual({
					message: "Forbidden",
					code: 403,
					type: "ORIGIN_NOT_ALLOWED",
					name: "ForbiddenError",
				});
			})
			.then(() => broker.stop())
			.catch((err) =>
				broker.stop().then(() => {
					throw err;
				})
			);
	});

	it("with custom global settings (boolean)", () => {
		[broker, service, server] = setup({
			cors: {
				origin: true,
			},
		});

		return broker
			.start()
			.then(() =>
				request(server)
					.get("/test/hello")
					.set("Origin", "http://localhost:3000")
			)
			.then((res) => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["access-control-allow-origin"]).toBe("*");
			})
			.then(() => broker.stop())
			.catch((err) =>
				broker.stop().then(() => {
					throw err;
				})
			);
	});

	it("with custom global settings (string)", () => {
		[broker, service, server] = setup({
			cors: {
				origin: "http://localhost:3000",
			},
		});

		return broker
			.start()
			.then(() =>
				request(server)
					.get("/test/hello")
					.set("Origin", "http://localhost:3000")
			)
			.then((res) => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
				expect(res.headers["vary"]).toBe("Origin");
			})
			.then(() => broker.stop())
			.catch((err) =>
				broker.stop().then(() => {
					throw err;
				})
			);
	});

it("with custom global settings (regexp)", () => {
	[broker, service, server] = setup({
		cors: {
			origin: /localhost/,
		},
	});

	return broker
		.start()
		.then(() =>
			request(server)
				.get("/test/hello")
				.set("Origin", "http://localhost:3000")
		)
		.then((res) => {
			expect(res.statusCode).toBe(200);
			expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
			expect(res.headers["vary"]).toBe("Origin");
		})
		.then(() => broker.stop())
		.catch((err) =>
			broker.stop().then(() => {
				throw err;
			})
		);
	});		

	it("with custom global settings (array)", () => {
		[broker, service, server] = setup({
			cors: {
				origin: ["http://localhost:3000", /^https/],
			}
		});

		return broker.start()
			.then(() => request(server)
				.get("/test/hello")
				.set("Origin", "https://localhost:4000"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["access-control-allow-origin"]).toBe("https://localhost:4000");
				expect(res.headers["vary"]).toBe("Origin");
			})
			.then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("errors on mismatching origin header", () => {
	[broker, service, server] = setup({
		cors: {
			origin: "a",
		},
	});
	return broker
		.start()
		.then(() =>
			request(server)
				.get("/test/hello")
				.set("Origin", "http://localhost:3000")
		)
		.then((res) => {
			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({
				message: "Forbidden",
				code: 403,
				type: "ORIGIN_NOT_ALLOWED",
				name: "ForbiddenError",
			});
		})
		.then(() => broker.stop())
		.catch((err) =>
			broker.stop().then(() => {
				throw err;
			})
		);
	});	

	it("with custom route settings", () => {
		[broker, service, server] = setup({
			cors: {
				origin: ["http://localhost:3000", "https://localhost:4000"],
				exposedHeaders: ["X-Custom-Header", "X-Response-Time"],
				credentials: true
			},
			routes: [{
				cors: {
					origin: "http://test-server",
					credentials: false,
					exposedHeaders: ["X-Response-Time"]
				}
			}]
		});

		return broker.start()
			.then(() => request(server)
				.get("/test/hello")
				.set("Origin", "http://test-server"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["access-control-allow-origin"]).toBe("http://test-server");
				expect(res.headers["access-control-expose-headers"]).toBe("X-Response-Time");

				expect(res.body).toBe("Hello Moleculer");
			})
			.then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("preflight request with custom route settings", () => {
		[broker, service, server] = setup({
			cors: {
				origin: ["http://localhost:3000"],
				exposedHeaders: ["X-Custom-Header", "X-Response-Time"]
			},
			routes: [{
				cors: {
					origin: "http://test-server",
					credentials: true,
					allowedHeaders: "X-Rate-Limiting",
					methods: ["GET", "POST", "DELETE"],
					maxAge: 3600
				}
			}]
		});

		return broker.start()
			.then(() => request(server)
				.options("/test/hello")
				.set("Origin", "http://test-server")
				.set("Access-Control-Request-Method", "GET"))
			.then(res => {
				expect(res.statusCode).toBe(204);
				expect(res.headers["access-control-allow-origin"]).toBe("http://test-server");
				expect(res.headers["access-control-allow-headers"]).toBe("X-Rate-Limiting");
				expect(res.headers["access-control-allow-methods"]).toBe("GET, POST, DELETE");
				expect(res.headers["access-control-allow-credentials"]).toBe("true");
				expect(res.headers["access-control-expose-headers"]).toBe("X-Custom-Header, X-Response-Time");
				expect(res.headers["access-control-max-age"]).toBe("3600");
				expect(res.headers["vary"]).toBe("Origin");

				expect(res.text).toBe("");
			})
			.then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("preflight request with default settings", () => {
		[broker, service, server] = setup({
			cors: {
				origin: true,
				allowedHeaders: ["X-Custom-Header", "X-Response-Time"]
			}
		});

		return broker.start()
			.then(() => request(server)
				.options("/test/hello")
				.set("Origin", "http://localhost:3000")
				.set("Access-Control-Request-Method", "GET"))
			.then(res => {
				expect(res.statusCode).toBe(204);
				expect(res.headers["access-control-allow-origin"]).toBe("*");
				expect(res.headers["access-control-allow-headers"]).toBe("X-Custom-Header, X-Response-Time");

				expect(res.text).toBe("");
			})
			.then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("preflight request with 'Access-Control-Request-Headers'", () => {
		[broker, service, server] = setup({
			cors: {
				origin: "http://localhost:3000",
				exposedHeaders: ["X-Custom-Header", "X-Response-Time"],
				methods: "GET",
			},
			routes: [{
				aliases: {
					"GET hello": "test.hello"
				},
				mappingPolicy: "restrict"
			}]
		});

		return broker.start()
			.then(() => request(server)
				.options("/hello")
				.set("Origin", "http://localhost:3000")
				.set("Access-Control-Request-Method", "GET")
				.set("Access-Control-Request-Headers", "X-Rate-Limiting"))
			.then(res => {
				expect(res.statusCode).toBe(204);
				expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
				expect(res.headers["access-control-allow-headers"]).toBe("X-Rate-Limiting");
				expect(res.headers["access-control-allow-methods"]).toBe("GET");
				expect(res.headers["access-control-expose-headers"]).toBe("X-Custom-Header, X-Response-Time");
				expect(res.headers["vary"]).toBe("Access-Control-Request-Headers");

				expect(res.text).toBe("");
			})
			.then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});
});

describe("Test Rate Limiter", () => {
	let broker;
	let service;
	let server;
	let clock;

	beforeAll(() => {
		clock = lolex.install();

		[broker, service, server] = setup({
			rateLimit: {
				window: 10000,
				limit: 3,
				headers: true
			}
		});

		return broker.start();
	});

	afterAll(() => {
		clock.uninstall();
		return broker.stop();
	});

	it("with headers #1", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-rate-limit-limit"]).toBe("3");
				expect(res.headers["x-rate-limit-remaining"]).toBe("2");
				expect(res.headers["x-rate-limit-reset"]).toBe("10000");

				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("with headers #2", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-rate-limit-limit"]).toBe("3");
				expect(res.headers["x-rate-limit-remaining"]).toBe("1");
				expect(res.headers["x-rate-limit-reset"]).toBe("10000");

				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("with headers #3", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-rate-limit-limit"]).toBe("3");
				expect(res.headers["x-rate-limit-remaining"]).toBe("0");
				expect(res.headers["x-rate-limit-reset"]).toBe("10000");

				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("with headers #4", () => {
		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(429);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-rate-limit-limit"]).toBe("3");
				expect(res.headers["x-rate-limit-remaining"]).toBe("0");
				expect(res.headers["x-rate-limit-reset"]).toBe("10000");

				expect(res.body).toEqual({
					code: 429,
					message: "Rate limit exceeded",
					name: "RateLimitExceeded"
				});
			});
	});

	it("with headers #5", () => {
		clock.tick(11 * 1000);

		return request(server)
			.get("/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-rate-limit-limit"]).toBe("3");
				expect(res.headers["x-rate-limit-remaining"]).toBe("2");
				expect(res.headers["x-rate-limit-reset"]).toBe("20000");

				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("Test StoreFactory", () => {
		let factory = jest.fn();
		[broker, service, server] = setup({
			rateLimit: {
				window: 10000,
				limit: 3,
				StoreFactory: factory
			}
		});

		expect(factory).toHaveBeenCalledTimes(1);
		expect(factory).toHaveBeenCalledWith(10000, service.routes[0].rateLimit);
	});
});

describe("Test onBeforeCall & onAfterCall", () => {

	it("should call handlers", () => {
		const broker = new ServiceBroker({ logger: true, logLevel: "error" });
		broker.loadService("./test/services/test.service");

		const beforeCall = jest.fn((ctx, route, req, res) => {
			expect(ctx.action.name).toBe("api.rest");

			ctx.meta.custom = "John";
			ctx.meta.endpoint = req.$endpoint ? req.$endpoint.name : null;
			ctx.meta.action = req.$action ? req.$action.name : null;
		});
		const afterCall = jest.fn((ctx, route, req, res, data) => {
			expect(req.$service).toBeDefined();
			expect(req.$route).toBeDefined();
			expect(req.$params).toBeDefined();
			expect(req.$endpoint).toBeDefined();

			expect(res.$service).toBeDefined();
			expect(res.$route).toBeDefined();

			res.setHeader("X-Custom-Header", "working");
			return data;
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					aliases: {
						"hello": "test.hello",
						"custom": (req, res) => res.end("Hello Custom")
					},
					onBeforeCall: beforeCall,
					onAfterCall: afterCall,
				}]
			}
		});
		const server = service.server;

		expect(service.routes[0].onBeforeCall).toBeDefined();
		expect(service.routes[0].onAfterCall).toBeDefined();

		return broker.start()
			.then(() => request(server)
				.get("/hello"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-custom-header"]).toBe("working");
				expect(res.body).toBe("Hello Moleculer");
				expect(beforeCall).toHaveBeenCalledTimes(1);
				expect(beforeCall).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));

				const ctx = beforeCall.mock.calls[0][0];
				const req = beforeCall.mock.calls[0][2];
				const response = beforeCall.mock.calls[0][3];

				expect(ctx.action.name).toBe("api.rest");
				expect(ctx.meta.endpoint).toBe(broker.nodeID + ":test.hello");
				expect(ctx.meta.action).toBe("test.hello");

				expect(req.$service).toBeDefined();
				expect(req.$route).toBeDefined();
				expect(req.$params).toBeDefined();
				expect(req.$endpoint).toBeDefined();
				expect(req.$action).toBeDefined();
				expect(req.$action.name).toBe("test.hello");

				expect(response.$service).toBeDefined();
				expect(response.$route).toBeDefined();


				expect(afterCall).toHaveBeenCalledTimes(1);
				expect(afterCall).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse), "Hello Moleculer");
				expect(afterCall.mock.calls[0][0].meta.custom).toBe("John");

				beforeCall.mockClear();
				afterCall.mockClear();
			})
			.then(() => request(server)
				.get("/custom"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toBe("Hello Custom");
				expect(beforeCall).toHaveBeenCalledTimes(1);
				expect(beforeCall).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));

				const ctx = beforeCall.mock.calls[0][0];
				const req = beforeCall.mock.calls[0][2];
				const response = beforeCall.mock.calls[0][3];

				expect(ctx.action.name).toBe("api.rest");
				expect(ctx.meta.endpoint).toBeNull();
				expect(ctx.meta.action).toBeNull();

				expect(req.$service).toBeDefined();
				expect(req.$route).toBeDefined();
				expect(req.$params).toBeDefined();
				expect(req.$endpoint).toBeUndefined();

				expect(response.$service).toBeDefined();
				expect(response.$route).toBeDefined();

				expect(afterCall).toHaveBeenCalledTimes(0);
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should modify response in 'onAfterCall'", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const afterCall = jest.fn((ctx, route, req, res, data) => {
			return {
				id: 123,
				name: "John",
				old: data
			};
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					onAfterCall: afterCall,
				}]
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/test/json"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					id: 123,
					name: "John",
					old: {
						id: 1,
						name: "Eddie"
					}
				});
				expect(afterCall).toHaveBeenCalledTimes(1);
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});
});

describe("Test encodeResponse", () => {

	it("should call encodeResponse in sendResponse", () => {
		const broker = new ServiceBroker({ logger: true, logLevel: "error" });
		broker.loadService("./test/services/test.service");

		const encodeResponse = jest.fn((req, res, data) => {
			return JSON.stringify(req.headers["accept"]);
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					aliases: {
						"hello": "test.hello",
					},
				}]
			},
			methods: {
				encodeResponse: encodeResponse,
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/hello")
				.set("Accept", "some/encoding"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.body).toBe("some/encoding");
				expect(encodeResponse).toHaveBeenCalledTimes(1);
				expect(encodeResponse).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(String));

				encodeResponse.mockClear();
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should overwrite the content type header", () => {
		const broker = new ServiceBroker({ logger: true, logLevel: "error" });
		broker.loadService("./test/services/test.service");

		const encodeResponse = jest.fn((req, res, data) => {
			res.setHeader("Content-Type", "text/html");
			return data;
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					aliases: {
						"hello": "test.hello",
					},
				}]
			},
			methods: {
				encodeResponse: encodeResponse,
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/hello"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toBe("Hello Moleculer");
				expect(res.header["content-type"]).toBe("text/html");
				expect(encodeResponse).toHaveBeenCalledTimes(1);
				expect(encodeResponse).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(String));

				encodeResponse.mockClear();
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should call encodeResponse in sendError", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const encodeResponse = jest.fn((req, res, data) => {
			return JSON.stringify(req.headers["accept"]);
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					aliases: {
						"error": "test.error",
					},
				}]
			},
			methods: {
				encodeResponse: encodeResponse,
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/error")
				.set("Accept", "some/encoding"))
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.body).toBe("some/encoding");
				expect(encodeResponse).toHaveBeenCalledTimes(1);
				expect(encodeResponse).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Object));

				encodeResponse.mockClear();
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});
});

describe("Test route middlewares", () => {

	it("should call global & route middlewares", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const mwg = jest.fn((req, res, next) => next());

		const mw1 = jest.fn((req, res, next) => {
			res.setHeader("X-Custom-Header", "middleware");
			next();
		});

		const mw2 = jest.fn((req, res, next) => {
			next();
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				use: [mwg],
				routes: [{
					path: "/",
					use: [mw1, mw2]
				}]
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/test/hello/"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.headers["x-custom-header"]).toBe("middleware");

				expect(res.body).toBe("Hello Moleculer");
				expect(mwg).toHaveBeenCalledTimes(1);
				expect(mwg).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(mw1).toHaveBeenCalledTimes(1);
				expect(mw1).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(mw2).toHaveBeenCalledTimes(1);
				expect(mw2).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should return with error if middlewares call next with error", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const mw1 = jest.fn((req, res, next) => {
			next(new Error("Something went wrong"));
		});

		const mw2 = jest.fn((req, res, next) => {
			next();
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					path: "/",
					use: [mw1, mw2]
				}]
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");

				expect(res.body).toEqual({
					message: "Something went wrong",
					code: 500,
					name: "MoleculerError"
				});
				expect(mw1).toHaveBeenCalledTimes(1);
				expect(mw1).toHaveBeenCalledWith(expect.any(http.IncomingMessage), expect.any(http.ServerResponse), expect.any(Function));

				expect(mw2).toHaveBeenCalledTimes(0);
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

});

describe("Test authentication", () => {

	it("don't enabled authentication if missing 'authenticate' method", () => {
		let service = setup({
			routes: [{
				authentication: true
			}]
		})[1];

		expect(service.routes[0].authentication).toBe(false);
	});

	it("authenticated user", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const user = {
			id: "my-user-id",
			username: "my-user-name",
			email: "my@user.mail"
		};
		const authenticate = jest.fn(() => Promise.resolve(user));
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					authentication: true
				}]
			},
			methods: {
				authenticate
			}
		});
		const server = service.server;

		expect(service.routes[0].authentication).toBe(true);

		return broker.start()
			.then(() => request(server)
				.get("/test/whoami"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");

				expect(res.body).toBe(`Hello ${user.username}`);
				expect(authenticate).toHaveBeenCalledTimes(1);
				expect(authenticate).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("anonymous user", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const authenticate = jest.fn(() => Promise.resolve(null));
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					authentication: true
				}]
			},
			methods: {
				authenticate
			}
		});
		const server = service.server;

		expect(service.routes[0].authentication).toBe(true);

		return broker.start()
			.then(() => request(server)
				.get("/test/whoami"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");

				expect(res.body).toBe("Who are you?");
				expect(authenticate).toHaveBeenCalledTimes(1);
				expect(authenticate).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("authentication failed", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const authenticate = jest.fn(() => Promise.reject(new MoleculerError("Not available", 400)));
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					authentication: true
				}]
			},
			methods: {
				authenticate
			}
		});
		const server = service.server;

		expect(service.routes[0].authentication).toBe(true);

		return broker.start()
			.then(() => request(server)
				.get("/test/whoami"))
			.then(res => {
				expect(res.statusCode).toBe(400);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");

				expect(res.body).toEqual({
					code: 400,
					message: "Not available",
					name: "MoleculerError"
				});
				expect(authenticate).toHaveBeenCalledTimes(1);
				expect(authenticate).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

});

describe("Test authorization", () => {

	it("don't enabled authorization if missing 'authorize' method", () => {
		let service = setup({
			routes: [{
				authorization: true
			}]
		})[1];

		expect(service.routes[0].authorization).toBe(false);
	});

	it("should return with data", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const authorize = jest.fn(() => Promise.resolve());
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					authorization: true
				}]
			},
			methods: {
				authorize
			}
		});
		const server = service.server;

		expect(service.routes[0].authorization).toBe(true);

		return broker.start()
			.then(() => request(server)
				.get("/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");

				expect(res.body).toBe("Hello Moleculer");
				expect(authorize).toHaveBeenCalledTimes(1);
				expect(authorize).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should give back error", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		const authorize = jest.fn(() => Promise.reject(new UnAuthorizedError(ERR_NO_TOKEN)));
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					authorization: true
				}]
			},
			methods: {
				authorize
			}
		});
		const server = service.server;

		expect(service.routes[0].authorization).toBe(true);

		return broker.start()
			.then(() => request(server)
				.get("/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(401);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"message": "Unauthorized",
					"code": 401,
					"type": "NO_TOKEN",
					"name": "UnAuthorizedError"
				});
				expect(authorize).toHaveBeenCalledTimes(1);
				expect(authorize).toHaveBeenCalledWith(expect.any(Context), expect.any(Object), expect.any(http.IncomingMessage), expect.any(http.ServerResponse));
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

});

describe("Test onError handlers", () => {

	it("should return with JSON error object", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					path: "/api"
				}]
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/api/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					code: 404,
					data: {
						action: "test.hello"
					},
					message: "Service 'test.hello' is not found.",
					name: "ServiceNotFoundError",
					type: "SERVICE_NOT_FOUND"
				});
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should return with global error handler response", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					path: "/api",
				}],
				onError(req, res, err) {
					res.setHeader("Content-Type", "text/plain");
					res.writeHead(501);
					res.end("Global error: " + err.message);
				}
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/api/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(501);
				expect(res.headers["content-type"]).toBe("text/plain");

				expect(res.text).toBe("Global error: Service 'test.hello' is not found.");
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});

	it("should return with route error handler response", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					path: "/api",
					onError(req, res, err) {
						res.setHeader("Content-Type", "text/plain");
						res.writeHead(500);
						res.end("Route error: " + err.message);
					}
				}],

				onError(req, res, err) {
					res.setHeader("Content-Type", "text/plain");
					res.writeHead(501);
					res.end("Global error: " + err.message);
				}
			}
		});
		const server = service.server;

		return broker.start()
			.then(() => request(server)
				.get("/api/test/hello"))
			.then(res => {
				expect(res.statusCode).toBe(500);
				expect(res.headers["content-type"]).toBe("text/plain");

				expect(res.text).toBe("Route error: Service 'test.hello' is not found.");
			}).then(() => broker.stop()).catch(err => broker.stop().then(() => { throw err; }));
	});
});

describe("Test lifecycle events", () => {

	it("`created` with only HTTP", () => {
		const broker = new ServiceBroker({ logger: false });

		const service = broker.createService(ApiGateway);
		expect(service.isHTTPS).toBe(false);
	});

	it("`created` with HTTPS", () => {
		const broker = new ServiceBroker({ logger: false });

		const service = broker.createService(ApiGateway, {
			settings: {
				https: {
					key: fs.readFileSync(path.join(__dirname, "..", "..", "examples", "ssl", "key.pem")),
					cert: fs.readFileSync(path.join(__dirname, "..", "..", "examples", "ssl", "cert.pem"))
				},
			}
		});
		expect(service.isHTTPS).toBe(true);
	});

	it("`started`", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(ApiGateway);
		const server = service.server;

		server.listen = jest.fn();

		service.schema.started.call(service);

		expect(server.listen).toHaveBeenCalledTimes(1);
		expect(server.listen).toHaveBeenCalledWith(service.settings.port, service.settings.ip, expect.any(Function));
	});

	it("`stopped`", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(ApiGateway);
		const server = service.server;
		server.listen();

		const oldClose = server.close;
		server.close = jest.fn();

		service.schema.stopped.call(service);

		expect(server.close).toHaveBeenCalledTimes(1);
		expect(server.close).toHaveBeenCalledWith(expect.any(Function));

		oldClose.call(server);
	});
});

describe("Test route.path and aliases", () => {
	let broker;
	let service;
	let nextHandler = jest.fn((req, res) => res.sendStatus(200));

	beforeAll(() => {

		broker = new ServiceBroker({ logger: false });

		service = broker.createService(ApiGateway, {
			settings: {
				path: "/api",
				autoAliases: true,
				routes: [{
					path: "/te",
					aliases: {
						"GET test"(req, res) {
							res.end("/api/te/test");
						}
					}
				}, {
					path: "",
					aliases: {
						"GET test"(req, res) {
							res.end("/api/test");
						}
					}
				}]
			}
		});
		broker.loadService("./test/services/test.service");

		return broker.start();
	});

	afterAll(() => {
		return broker.stop();
	});

	it("GET /api/te/test", () => {
		return request(service.server)
			.get("/api/te/test")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toBe("/api/te/test");
				expect(nextHandler).toHaveBeenCalledTimes(0);
			});
	});

	it("GET /api/test", () => {
		return request(service.server)
			.get("/api/test")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toBe("/api/test");
				expect(nextHandler).toHaveBeenCalledTimes(0);
			});
	});

});


describe("Test middleware mode", () => {
	let broker;
	let app;
	let service;
	let nextHandler = jest.fn((req, res) => res.sendStatus(200));

	beforeAll(() => {

		broker = new ServiceBroker({ logger: false });
		broker.loadService("./test/services/test.service");

		service = broker.createService(ApiGateway, {
			settings: {
				server: false,
				path: "/api"
			}
		});

		app = express();
		app.use(service.express(), nextHandler);

		return broker.start();
	});

	afterAll(() => {
		return broker.stop();
	});

	it("internal server is not defined in middleware mode", () => {
		expect(service.server).toBeUndefined();
	});

	it("GET /api/test/hello", () => {
		return request(app)
			.get("/api/test/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);

				expect(res.body).toBe("Hello Moleculer");
				expect(nextHandler).toHaveBeenCalledTimes(0);
			});
	});

	it("GET /missing", () => {
		return request(app)
			.get("/missing")
			.then(res => {
				expect(res.statusCode).toBe(200);

				expect(res.text).toBe("OK");
				expect(nextHandler).toHaveBeenCalledTimes(1);
			});
	});
});

describe("Test file uploading", () => {

	const broker = new ServiceBroker({ logger: false });

	broker.createService({
		name: "file",
		actions: {
			save(ctx) {
				return new this.Promise((resolve) => {
					if (ctx.params.pipe) {
						const hash = crypto.createHash("sha256");

						hash.on("readable", () => {
							const data = hash.read();
							if (data)
								resolve({ hash: data.toString("base64"), meta: ctx.meta });
						});

						ctx.params.pipe(hash);
					} else {
						resolve({ params: ctx.params, meta: ctx.meta });
					}
				});
			}
		}
	});

	const onFilesLimitFn = jest.fn();

	const service = broker.createService(ApiGateway, {
		settings: {
			routes: [{
				path: "/upload",

				bodyParsers: {
					json: false
				},

				aliases: {
					// File upload from HTML form
					"POST /": "multipart:file.save",

					// File upload from AJAX or cURL
					"PUT /": "stream:file.save",

					// File upload from AJAX or cURL
					"PUT /:id": "stream:file.save",

					// File upload from HTML form and overwrite busboy config
					"POST /multi": {
						type: "multipart",
						// Action level busboy config
						busboyConfig: {
							empty: true,
							limits: {
								files: 3
							}
						},
						action: "file.save"
					},

					"POST /form/:id": {
						type: "multipart",
						// Action level busboy config
						busboyConfig: {
							empty: true,
							limits: {
								files: 0
							}
						},
						action: "file.save"
					}
				},
				// https://github.com/mscdex/busboy#busboy-methods
				busboyConfig: {
					limits: {
						files: 1
					},
					onFilesLimit: onFilesLimitFn
				},
			}]
		}
	});
	const server = service.server;
	const assetsDir = __dirname + "/../assets/";

	const origHashes = {};
	const getHash = filename => {
		return new Promise((resolve) => {
			const hash = crypto.createHash("sha256");
			hash.on("readable", () => {
				const data = hash.read();
				if (data)
					resolve(data.toString("base64"));
			});
			fs.createReadStream(assetsDir + filename).pipe(hash);
		});
	};

	beforeAll(() => {
		return broker.start()
			.then(() => Promise.all([
				getHash("logo.png").then(hash => origHashes["logo.png"] = hash),
				getHash("lorem.txt").then(hash => origHashes["lorem.txt"] = hash),
			]));
	});
	afterAll(() => broker.stop());

	it("should upload a file with multipart", () => {
		return request(server)
			.post("/upload")
			.attach("myFile", assetsDir + "logo.png")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ hash: origHashes["logo.png"], meta: {
					$multipart: {},
					$params: {},
					encoding: "7bit",
					fieldname: "myFile",
					filename: "logo.png",
					mimetype: "image/png"
				} });

				expect(onFilesLimitFn).toHaveBeenCalledTimes(0);
			});
	});

	it("should send data field with multipart", () => {
		return request(server)
			.post("/upload")
			.attach("myFile", assetsDir + "logo.png")
			.field("name", "moleculer")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ hash: origHashes["logo.png"], meta: {
					$multipart: {
						name: "moleculer"
					},
					$params: {},
					encoding: "7bit",
					fieldname: "myFile",
					filename: "logo.png",
					mimetype: "image/png"
				}  });

				expect(onFilesLimitFn).toHaveBeenCalledTimes(0);
			});
	});

	it("should call service with fields only", () => {
		return request(server)
			.post("/upload/form/f1234")
			.field("name", "moleculer")
			.field("more", "services")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual([{
					meta: {
						$multipart: { name: "moleculer", more: "services" },
						$params: { id: "f1234" }
					},
					params: {}
				}]);
			});
	});

	it("should upload multiple file but only accept one file", () => {
		return request(server)
			.post("/upload")
			.attach("myFile", assetsDir + "logo.png")
			.attach("myText", assetsDir + "lorem.txt")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ hash: origHashes["logo.png"], meta: {
					$multipart: {},
					$params: {},
					encoding: "7bit",
					fieldname: "myFile",
					filename: "logo.png",
					mimetype: "image/png"
				}  });
				expect(onFilesLimitFn).toHaveBeenCalledTimes(1);
				expect(onFilesLimitFn).toHaveBeenCalledWith(expect.any(Busboy), expect.any(Alias), service);
			});
	});

	it("should upload multiple file with multipart", () => {
		return request(server)
			.post("/upload/multi")
			.attach("myFile", assetsDir + "logo.png")
			.attach("myText", assetsDir + "lorem.txt")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual([
					{ hash: origHashes["logo.png"], meta: {
						$multipart: {},
						$params: {},
						encoding: "7bit",
						fieldname: "myFile",
						filename: "logo.png",
						mimetype: "image/png"
					}  },
					{ hash: origHashes["lorem.txt"], meta: {
						$multipart: {},
						$params: {},
						encoding: "7bit",
						fieldname: "myText",
						filename: "lorem.txt",
						mimetype: "text/plain"
					}  }
				]);
			});
	});

	it("should upload file as stream", () => {
		const buffer = fs.readFileSync(assetsDir + "logo.png");

		return request(server)
			.put("/upload")
			.send(buffer)
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ hash: origHashes["logo.png"], meta: {
					$params: {},
				}  });
			});

	});

	it("should upload file as stream with url params", () => {
		const buffer = fs.readFileSync(assetsDir + "logo.png");

		return request(server)
			.put("/upload/f1234")
			.send(buffer)
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ hash: origHashes["logo.png"], meta: {
					$params: { id: "f1234" },
				} });
			});
	});

});

describe("Test dynamic routing", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: false
		});
		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should not find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("create route & should find '/my/hello'", () => {
		service.addRoute({
			path: "/my",
			aliases: {
				"hello": "test.hello"
			}
		});

		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("change route & should find '/other/hello'", () => {
		service.addRoute({
			path: "/other",
			aliases: {
				"hello": "test.hello"
			}
		});

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("remove route & should not find '/other/hello'", () => {
		service.removeRoute("/other");

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("but should find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("change route should replace aliases & find '/my/helloagain'", () => {
		service.addRoute({
			path: "/my",
			aliases: {
				"helloagain": "test.hello"
			}
		});

		return request(server)
			.get("/my/helloagain")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("but should not find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});
});

describe("Test dynamic routing with name", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: false
		});
		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should not find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("create route & should find '/my/hello'", () => {
		service.addRoute({
			name: "first",
			path: "/my",
			aliases: {
				"hello": "test.hello"
			}
		});

		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("change route & should find '/other/hello'", () => {
		service.addRoute({
			name: "second",
			path: "/other",
			aliases: {
				"hello": "test.hello"
			}
		});

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("remove route & should not find '/other/hello'", () => {
		service.removeRouteByName("second");

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("but should find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("change route should replace aliases & find '/my/helloagain'", () => {
		service.addRoute({
			name: "first",
			path: "/my",
			aliases: {
				"helloagain": "test.hello"
			}
		});

		return request(server)
			.get("/my/helloagain")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("but should not find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});
});


describe("Test dynamic routing with actions", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: false
		});
		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should not find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("create route & should find '/my/hello'", async () => {
		await broker.call("api.addRoute", {
			route: {
				path: "/my",
				aliases: {
					"hello": "test.hello"
				}
			}
		});

		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("change route & should find '/other/hello'", async () => {
		await broker.call("api.addRoute", {
			route: {
				path: "/other",
				aliases: {
					"hello": "test.hello"
				}
			}
		});

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("remove route & should not find '/other/hello'", async () => {
		await broker.call("api.removeRoute", { path: "/other" });

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("but should find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});
});

describe("Test route path optimization", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [
				{ path: "/", aliases: { "b": "test.hello" } },
				{ path: "/a", aliases: { "c": "test.hello" } },
				{
					path: "/a/b", aliases: {
						"c": "test.hello",
						"d/:id": "test.params",
						"d/e": "test.params",
					}
				},
			]
		});
		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should find '/a/b/c'", () => {
		return request(server)
			.get("/a/b/c")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("should find '/a/c'", () => {
		return request(server)
			.get("/a/c")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("should find '/b'", () => {
		return request(server)
			.get("/b")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("should find '/a/b/d/e'", () => {
		return request(server)
			.get("/a/b/d/e")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({});
			});
	});

	it("should find '/a/b/d/:id'", () => {
		return request(server)
			.get("/a/b/d/1234")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({ id: "1234" });
			});
	});
});

describe("Test auto aliasing", () => {
	let broker;
	let service;
	let server;

	function regenerate() {
		service.routes.forEach(route => route.opts.autoAliases && service.regenerateAutoAliases(route));
	}

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [
				{
					path: "api",
					whitelist: [
						"posts.*",
						"test.hello",
						"test.full*",
						"test.base*",
						"test.update*"
					],

					autoAliases: true,

					aliases: {
						"GET /postList": "posts.list"
					}
				}
			]
		}/*, { logger: true }*/);

		broker.loadService("./test/services/posts.service");
		broker.loadService("./test/services/test.service");

		return broker.start().then(() => regenerate());
	});

	afterAll(() => broker.stop());

	it("should call 'GET /api/hi'", () => {
		return request(server)
			.get("/api/hi")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("should call 'GET /api/posts'", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.length).toBe(5);
			});
	});

	it("should call 'GET /api/posts/:id'", () => {
		const postService = broker.getLocalService("posts");
		return request(server)
			.get("/api/posts/" + postService.rows[3].id)
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual(postService.rows[3]);
			});
	});

	it("should call 'POST /api/posts'", () => {
		const postService = broker.getLocalService("posts");
		return request(server)
			.post("/api/posts/")
			.send({
				id: 123,
				title: "Test post"
			})
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					id: 123,
					title: "Test post"
				});
				expect(postService.rows.length).toBe(6);
			});
	});

	it("should call 'PUT /api/posts'", () => {
		return request(server)
			.put("/api/posts/123")
			.send({
				title: "Test post (modified)"
			})
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					id: 123,
					title: "Test post (modified)"
				});
			});
	});

	it("should call 'DELETE /api/posts'", () => {
		const postService = broker.getLocalService("posts");
		return request(server)
			.delete("/api/posts/123")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(postService.rows.length).toBe(5);
			});
	});

	it("unload `posts` service & regenerate aliases", () => {
		const postService = broker.getLocalService("posts");
		return broker.destroyService(postService)
			.then(() => regenerate());
	});

	it("should call 'GET /api/posts'", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"name": "NotFoundError",
					"message": "Not found",
					"code": 404,
					"type": "NOT_FOUND"
				});
			});
	});

	it("should call 'GET /api/custom-base-path/base-path'", () => {
		return request(server)
			.get("/api/custom-base-path/base-path")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Custom Moleculer Root Path");
			});
	});

	it("should not call 'GET /api/custom-base-path/base-path-error'", () => {
		return request(server)
			.get("/api/custom-base-path/base-path-error")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("reload `posts` service & regenerate aliases", () => {
		broker.loadService("./test/services/posts.service");
		return broker.Promise.delay(100)
			.then(() => regenerate());
	});

	it("should call 'GET /api/posts'", () => {
		return request(server)
			.get("/api/posts")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body.length).toBe(5);
			});
	});

	it("should call 'GET /fullPath'", () => {
		return request(server)
			.get("/fullPath")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Full path");
			});
	});

	it("should call PUT /update and PATCH /update", () => {
		return Promise.all([
			request(server).put("/api/update").query({ name: "John" }),
			request(server).patch("/api/update").query({ name: "John" })
		]).then((results) => {
			results.forEach(result => {
				expect(result.statusCode).toBe(200);
				expect(result.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(result.body).toBe("Hello John");
			});
		});
	});
});

describe("Test ETag cache control", () => {

	describe("with enabled default ETag", () => {
		let broker;
		let service;
		let server;

		beforeAll(() => {
			[broker, service, server] = setup({
				etag: false,
				routes: [{
					path: "/",
					etag: true
				}]
			});
			broker.loadService("./test/services/test.service");
			return broker.start();
		});

		afterAll(() => broker.stop());
		it("should add Etag to response", () => {
			return request(server)
				.get("/test/greeter")
				.query({ name: "tiaod" })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe("W/\"d-q+AO2Lbr8LT+rw9AWUCOel9HJU4\"");
				});
		});

		it("should response status 304 when etag matched", () => {
			return request(server)
				.get("/test/greeter")
				.query({ name: "tiaod" })
				.set("If-None-Match", "\"d-q+AO2Lbr8LT+rw9AWUCOel9HJU4\"")
				.then(res => {
					expect(res.statusCode).toBe(304);
					expect(res.headers["etag"]).toBe("W/\"d-q+AO2Lbr8LT+rw9AWUCOel9HJU4\"");
				});
		});

		it("should return status 200 when response is not fresh", () => {
			return request(server)
				.get("/test/freshness")
				.set("If-Modified-Since", "Thu, 31 Mar 2016 07:07:52 GMT")
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["last-modified"]).toBe("Mon, 06 Aug 2018 14:23:28 GMT");
				});
		});

		it("should return status 304 when response is fresh", () => {
			return request(server)
				.get("/test/freshness")
				.set("If-Modified-Since", "Mon, 06 Aug 2018 14:28:00 GMT")
				.then(res => {
					expect(res.statusCode).toBe(304);
					expect(res.headers["last-modified"]).toBe("Mon, 06 Aug 2018 14:23:28 GMT");
				});
		});

		it("should not generate etag when streaming response", () => {
			return request(server)
				.get("/test/stream")
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe(undefined);
				});
		});

		it("should use the etag in ctx.meta.$responseHeaders['ETag']", () => {
			return request(server)
				.get("/test/etag")
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe("my custom etag");
				});
		});

		it("should skip body for HEAD", () => {
			return request(server)
				.head("/test/greeter")
				.query({ name: "tiaod" })
				.then(res => {
					expect(res.body).toEqual({});
				});
		});

		it("should strip irrelevant headers when sending 304 response", () => {
			return request(server)
				.head("/test/greeter")
				.query({ name: "tiaod" })
				.set("If-None-Match", "W/\"d-q+AO2Lbr8LT+rw9AWUCOel9HJU4\"")
				.then(res => {
					expect(res.headers["content-type"]).toBe(undefined);
					expect(res.headers["content-length"]).toBe(undefined);
					expect(res.headers["transfer-encoding"]).toBe(undefined);
				});
		});
	});

	describe("with enabled weak ETag", () => {
		let broker;
		let service;
		let server;

		beforeAll(() => {
			[broker, service, server] = setup({
				etag: "weak",
				routes: [{
					path: "/",
				}]
			});
			broker.loadService("./test/services/test.service");
			return broker.start();
		});

		afterAll(() => broker.stop());
		it("should add Etag to response", () => {
			return request(server)
				.get("/test/greeter")
				.query({ name: "tiaod" })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe("W/\"d-q+AO2Lbr8LT+rw9AWUCOel9HJU4\"");
				});
		});
	});

	describe("with enabled strong ETag", () => {
		let broker;
		let service;
		let server;

		beforeAll(() => {
			[broker, service, server] = setup({
				etag: "strong",
				routes: [{
					path: "/",
				}]
			});
			broker.loadService("./test/services/test.service");
			return broker.start();
		});

		afterAll(() => broker.stop());
		it("should add Etag to response", () => {
			return request(server)
				.get("/test/greeter")
				.query({ name: "tiaod" })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe("\"d-q+AO2Lbr8LT+rw9AWUCOel9HJU4\"");
				});
		});
	});

	describe("with custom ETag generator", () => {
		let broker;
		let service;
		let server;

		let custETag = jest.fn(() => "123abc");

		beforeAll(() => {
			[broker, service, server] = setup({
				etag: true,
				routes: [{
					path: "/",
					etag: custETag
				}]
			});
			broker.loadService("./test/services/test.service");
			return broker.start();
		});

		afterAll(() => broker.stop());

		it("should add Etag to response", () => {
			return request(server)
				.get("/test/greeter")
				.query({ name: "tiaod" })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe("123abc");

					expect(custETag).toHaveBeenCalledTimes(1);
					expect(custETag).toHaveBeenCalledWith("\"Hello tiaod\"");
				});
		});
	});

	describe("with disabled ETag", () => {
		let broker;
		let service;
		let server;

		beforeAll(() => {
			[broker, service, server] = setup();
			broker.loadService("./test/services/test.service");
			return broker.start();
		});

		afterAll(() => broker.stop());
		it("should not add ETag to response", () => {
			return request(server)
				.get("/test/greeter")
				.query({ name: "tiaod" })
				.then(res => {
					expect(res.statusCode).toBe(200);
					expect(res.headers["etag"]).toBe(undefined);
				});
		});
	});
});

describe("Test new alias handling", () => {
	let broker;
	let server;
	let service;

	beforeAll(() => {
		[broker, service, server] = setup({
			path: "/api",
			routes: [
				{
					path: "",
					aliases: {
						"GET users": "users.create1",
						"GET people": "people.list" // 503
					},
				},
				{
					path: "/user",
					aliases: {
						"GET users": "users.create2",
					},
				},
				{
					path: "/lang/:lng/",
					aliases: {
						"GET /": (req, res) => {
							res.end("Received lang: " + req.$params.lng);
						}
					}
				}
			],
		});

		broker.createService({
			name: "users",
			actions: {
				create1() {
					return "OK1";
				},
				create2() {
					return "OK2";
				}
			}
		});

		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should find '/api/user/users'", () => {
		return request(server)
			.get("/api/user/users")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual("OK2");
			});
	});

	it("should find '/api/users'", () => {
		return request(server)
			.get("/api/users")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual("OK1");
			});
	});

	it("should receive the language '/api/lang/:lng'", () => {
		return request(server)
			.get("/api/lang/hu")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.text).toEqual("Received lang: hu");
			});
	});

	it("should return 503 - Service unavailable for '/api/people'", () => {
		return request(server)
			.get("/api/people")
			.then(res => {
				expect(res.statusCode).toBe(503);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"name": "ServiceUnavailableError",
					"message": "Service unavailable",
					"code": 503
				});
			});
	});

});

describe("Test internal service special char", () => {
	let broker;
	let server;
	let service;

	beforeAll(() => {
		[broker, service, server] = setup({
			path: "/api",
			internalServiceSpecialChar: "@",
		});

		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should call '/api/@node.health'", () => {
		return request(server)
			.get("/api/@node/health")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
			});
	});

	it("should not call '/api/$node.health'", () => {
		return request(server)
			.get("/api/~node/health")
			.then(res => {
				expect(res.statusCode).toBe(404);
			});
	});
});

describe("Test httpServerTimeout setting", () => {
	let broker;
	let server;
	let service;

	beforeAll(() => {
		[broker, service, server] = setup({
			httpServerTimeout: 500
		});

		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should return response", () => {
		return request(server)
			.post("/test/apitimeout")
			.send({ counter: 2, sleeptime: 100 })
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.body).toEqual({
					"status": 200,
					"msg": "apitimeout response"
				});
			});
	});

	it("should throw timeout error", () => {
		return request(server)
			.post("/test/apitimeout")
			.send({ counter: 6, sleeptime: 100 })
			.then(res => {
				expect(true).toBe(false);
			})
			.catch(err => {
				expect(err.name).toBe("Error");
				expect(err.message).toBe("socket hang up");
			});
	});

});

describe("Test listAliases action", () => {
	let broker;
	let server;
	let service;

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [
				{
					path: "/api",

					aliases: {
						"GET aliases": "api.listAliases",
						"GET greeter": "test.greeter"
					},

					mappingPolicy: "restrict"
				},
				{
					path: "/admin",

					aliases: {
						"basePath": "test.basePath"
					}
				}
			]
		});

		broker.loadService("./test/services/test.service");

		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should return flat response", () => {
		return request(server)
			.get("/api/aliases")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.body).toEqual([
					{
						actionName: "api.listAliases",
						fullPath: "/api/aliases",
						methods: "GET",
						path: "aliases",
						routePath: "/api"
					},
					{
						actionName: "test.basePath",
						fullPath: "/admin/basePath",
						methods: "*",
						path: "basePath",
						routePath: "/admin"
					},
					{
						actionName: "test.greeter",
						fullPath: "/api/greeter",
						methods: "GET",
						path: "greeter",
						routePath: "/api"
					},
				]);
			});
	});

	it("should return grouped response with action schemas", () => {
		return request(server)
			.get("/api/aliases?grouping=true&withActionSchema=1")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.body).toEqual([
					{
						aliases: [
							{
								action: {
									name: "api.listAliases",
									params: {
										grouping: { convert: true, optional: true, type: "boolean" },
										withActionSchema: { convert: true, optional: true, type: "boolean" }
									},
									rawName: "listAliases",
									rest: "GET /list-aliases"
								},
								actionName: "api.listAliases",
								fullPath: "/api/aliases",
								methods: "GET",
								path: "aliases",
								routePath: "/api"
							},
							{
								action: {
									name: "test.greeter",
									params: { name: "string" },
									rawName: "greeter",
									rest: "/greeter"
								},
								actionName: "test.greeter",
								fullPath: "/api/greeter",
								methods: "GET",
								path: "greeter",
								routePath: "/api"
							}
						],
						path: "/api"
					},
					{
						aliases: [
							{
								action: {
									name: "test.basePath",
									rawName: "basePath",
									rest: {
										basePath: "custom-base-path",
										method: "GET",
										path: "/base-path"
									}
								},
								actionName: "test.basePath",
								fullPath: "/admin/basePath",
								methods: "*",
								path: "basePath",
								routePath: "/admin"
							}
						],
						path: "/admin"
					}
				]);
			});
	});
});

describe("Test multi REST interfaces in service settings", () => {
	let broker;
	let service;
	let server;

	function regenerate() {
		service.routes.forEach(route => route.opts.autoAliases && service.regenerateAutoAliases(route));
	}

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: [{
				path: "/",
				autoAliases: true
			}]
		});
		broker.loadService("./test/services/multiRoute.service");
		return broker.start().then(() => regenerate());
	});
	afterAll(() => broker.stop());

	it("should call both 'GET /route/hello' and 'GET /route/multi/hello'", () => {
		return Promise.all([
			request(server).get("/route/hello"),
			request(server).get("/route/multi/hello")
		]).then((results) => {
			results.forEach(result => {
				expect(result.statusCode).toBe(200);
				expect(result.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(result.body).toBe("Hello Moleculer");
			});
		});
	});

	it("should call both 'GET /route/greet' and 'GET /route/multi/greet' with parameter", () => {
		return Promise.all([
			request(server).get("/route/greet").query({ name: "John" }),
			request(server).get("/route/multi/greet").query({ name: "John" })
		]).then((results) => {
			results.forEach(result => {
				expect(result.statusCode).toBe(200);
				expect(result.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(result.body).toBe("Hello John");
			});
		});
	});

	it("should call 'GET /fullPath'", () => {
		return request(server)
			.get("/fullPath")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Full path");
			});
	});

	it("should call both 'GET /route/custom-base-path/base-path' and 'GET /route/multi/custom-base-path/base-path'", () => {
		return request(server)
			.get("/custom-base-path/base-path")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Custom Moleculer Root Path");
			});
	});

	it("should call multiple PUT /update and PATCH /update on /route and /route/multi base path ", () => {
		return Promise.all([
			request(server).put("/route/update").query({ name: "John" }),
			request(server).put("/route/multi/update").query({ name: "John" }),
			request(server).patch("/route/update").query({ name: "John" }),
			request(server).patch("/route/multi/update").query({ name: "John" })
		]).then((results) => {
			results.forEach(result => {
				expect(result.statusCode).toBe(200);
				expect(result.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(result.body).toBe("Hello John");
			});
		});
	});
});


describe("Test pathToRegexpOptions", () => {
	let broker;
	let server;
	let service;

	beforeAll(() => {
		[broker, service, server] = setup({
			path: "/api",
			routes: [
				{
					path: "/t1",
					aliases: {
						"GET users": "users.create1",
						"GET Users": "users.create2"
					},
				},
				{
					path: "/t2",
					aliases: {
						"GET users": "users.create1",
						"GET Users": "users.create2"
					},
					pathToRegexpOptions: {
						sensitive: true
					}
				},
			],
		});

		broker.createService({
			name: "users",
			actions: {
				create1() {
					return "OK1";
				},
				create2() {
					return "OK2";
				}
			}
		});

		return broker.start();
	});

	afterAll(() => broker.stop());

	it("should find 'create1'", () => {
		return request(server)
			.get("/api/t1/users")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual("OK1");
			});
	});

	it("should find 'create1'", () => {
		return request(server)
			.get("/api/t1/Users")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual("OK1");
			});
	});

	it("should find 'create1'", () => {
		return request(server)
			.get("/api/t2/users")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual("OK1");
			});
	});

	it("should find 'create2'", () => {
		return request(server)
			.get("/api/t2/Users")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual("OK2");
			});
	});


});

describe("Test named routes with same path", () => {
	let broker;
	let service;
	let server;

	const hook1 = jest.fn();
	const hook2 = jest.fn();

	beforeAll(() => {
		[broker, service, server] = setup({
			routes: false
		});
		return broker.start();
	});

	afterAll(() => broker.stop());

	beforeEach(() => {
		hook1.mockClear();
		hook2.mockClear();
	});

	it("should not find '/my/hi'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("should not find '/my/hello'", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(404);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toEqual({
					"code": 404,
					"message": "Not found",
					"name": "NotFoundError",
					"type": "NOT_FOUND"
				});
			});
	});

	it("create routes", () => {
		service.addRoute({
			name: "no-auth",
			path: "/my",
			aliases: {
				"hello": "test.hello"
			},
			onBeforeCall: hook1
		});

		service.addRoute({
			name: "with-auth",
			path: "/my",
			aliases: {
				"hi": "test.hello"
			},
			onBeforeCall: hook2
		});
	});

	it("should find 'hello", () => {
		return request(server)
			.get("/my/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");

				expect(hook1).toHaveBeenCalledTimes(1);
				expect(hook2).toHaveBeenCalledTimes(0);
			});
	});

	it("should find 'hi", () => {
		return request(server)
			.get("/my/hi")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");

				expect(hook1).toHaveBeenCalledTimes(0);
				expect(hook2).toHaveBeenCalledTimes(1);
			});
	});

	it("change route & should find '/other/hello'", () => {
		service.addRoute({
			name: "with-auth",
			path: "/other",
			aliases: {
				"hello": "test.hello"
			}
		});

		return request(server)
			.get("/other/hello")
			.then(res => {
				expect(res.statusCode).toBe(200);
				expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
				expect(res.body).toBe("Hello Moleculer");

				expect(hook1).toHaveBeenCalledTimes(0);
				expect(hook2).toHaveBeenCalledTimes(0);
			});
	});

});
