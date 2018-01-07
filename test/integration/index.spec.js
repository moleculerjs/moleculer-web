"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const request = require("supertest");
const express = require("express");
const lolex = require("lolex");
const ApiGateway = require("../../index");
const { ServiceBroker, Context } = require("moleculer");
const { UnAuthorizedError, ERR_NO_TOKEN } = ApiGateway.Errors;

function setup(settings) {
	const broker = new ServiceBroker({ nodeID: undefined });
	broker.loadService("./test/services/test.service");

	const service = broker.createService(ApiGateway, {
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
		[ broker, service, server] = setup();
	});

	it("GET /", () => {
		return request(server)
			.get("/")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					"code": 404,
					"message": "Service '' is not found.",
					"name": "ServiceNotFoundError",
					"type": null,
					"data": {
						action: "",
						nodeID: undefined
					}
				});
			});
	});

	it("GET /other/action", () => {
		return request(server)
			.get("/other/action")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					"code": 404,
					"message": "Service 'other.action' is not found.",
					"name": "ServiceNotFoundError",
					"type": null,
					"data": {
						action: "other.action",
						nodeID: undefined
					}
				});
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /test/greeter", () => {
		return request(server)
			.get("/test/greeter")
			.query({ name: "John" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello John");
			});
	});

	it("POST /test/greeter with query", () => {
		return request(server)
			.post("/test/greeter")
			.query({ name: "John" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello John");
			});
	});

	it("POST /test/greeter with body", () => {
		return request(server)
			.post("/test/greeter")
			.send({ name: "Adam" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Adam");
			});
	});

	it("POST /test/greeter with query & body", () => {
		return request(server)
			.post("/test/greeter")
			.query({ name: "John" })
			.send({ name: "Adam" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello John");
			});
	});

	it("GET /test/dangerZone", () => {
		return request(server)
			.get("/test/dangerZone")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					"code": 404,
					"message": "Service 'test.dangerZone' is not found.",
					"name": "ServiceNotFoundError",
					"type": null,
					"data": {
						action: "test.dangerZone",
						nodeID: undefined
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
		[ broker, service, server] = setup({
			routes:[{
				camelCaseNames: true
			}]
		});
		broker.options.metrics = true;
	});

	it("GET /test/text with 'text/plain'", () => {
		return request(server)
			.get("/test/text")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.header["x-request-id"]).toBeDefined();
				expect(res.body).toEqual("String text");
			});
	});

	it("GET /test/textPlain with 'text/plain'", () => {
		return request(server)
			.get("/test/textPlain")
			.expect(200)
			.expect("Content-Type", "text/plain")
			.then(res => {
				expect(res.text).toEqual("Plain text");
			});
	});

	it("GET /test/text-plain with 'text/plain'", () => {
		return request(server)
			.get("/test/text-plain")
			.expect(200)
			.expect("Content-Type", "text/plain")
			.then(res => {
				expect(res.text).toEqual("Plain text");
			});
	});

	it("GET /test/number", () => {
		return request(server)
			.get("/test/number")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual(123);
			});
	});

	it("GET /test/numberPlain", () => {
		return request(server)
			.get("/test/numberPlain")
			.expect(200)
			.expect("Content-Type", "text/plain")
			.then(res => {
				expect(res.text).toEqual("123");
			});
	});

	it("GET /test/boolean", () => {
		return request(server)
			.get("/test/boolean")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual(true);
			});
	});

	it("GET /test/json", () => {
		return request(server)
			.get("/test/json")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({ id: 1, name: "Eddie" });
			});
	});

	it("GET /test/jsonArray", () => {
		return request(server)
			.get("/test/jsonArray")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual([
					{ id: 1, name: "John" },
					{ id: 2, name: "Jane" }
				]);
			});
	});

	it("GET /test/buffer", () => {
		return request(server)
			.get("/test/buffer")
			.expect(200)
			.expect("Content-Type", "application/octet-stream")
			.expect("Content-Length", "15")
			.then(res => {
				expect(Buffer.from(res.body).toString("utf8")).toEqual("Buffer response");
			});
	});

	it("GET /test/bufferObj", () => {
		return request(server)
			.get("/test/bufferObj")
			.expect(200)
			.expect("Content-Type", "application/octet-stream")
			.expect("Content-Length", "22")
			.then(res => {
				expect(Buffer.from(res.body).toString("utf8")).toEqual("Buffer object response");
			});
	});

	it("GET /test/bufferJson", () => {
		return request(server)
			.get("/test/bufferJson")
			.expect(200)
			.expect("Content-Type", "application/json")
			.expect("Content-Length", "10")
			.then(res => {
				expect(res.body).toEqual({ a: 5 });
			});
	});

	it("GET /test/customHeader", () => {
		return request(server)
			.get("/test/customHeader")
			.expect(200)
			.expect("X-Custom-Header", "working")
			.expect("Content-Type", "text/plain")
			.then(res => {
				expect(res.text).toEqual("CustomHeader");
			});
	});

	it("GET /test/stream", () => {
		return request(server)
			.get("/test/stream")
			.expect(200)
			.expect("Content-Type", "application/octet-stream")
			.expect("Content-Disposition", "attachment; filename=\"stream-lorem.txt\"")
			.then(res => {
				expect(Buffer.from(res.body).toString("utf8")).toEqual("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in faucibus sapien, vitae aliquet nisi. Vivamus quis finibus tortor.");
			});
	});

	/*it("GET /test/streamWithError", () => {
		return request(server)
			.get("/test/streamWithError")
			.expect(500)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
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
			.expect(200)
			.then(res => {
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/null", () => {
		return request(server)
			.get("/test/null")
			.expect(200)
			.then(res => {
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/function", () => {
		return request(server)
			.get("/test/function")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.text).toEqual("");
			});
	});

	it("GET /test/error", () => {
		return request(server)
			.get("/test/error")
			.expect(505)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.header["x-request-id"]).toBeDefined();
				expect(res.body).toEqual({
					"code": 505,
					"message": "I'm dangerous",
					"name": "MoleculerServerError"
				});
			});
	});
});

describe("Test with `path` prefix", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
			path: "/my-api"
		});
		//broker.loadService("./test/services/math.service");
	});

	it("GET /", () => {
		return request(server)
			.get("/")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					code: 404,
					message: "Not found",
					name: "MoleculerError"
				});
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/test/hello")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					code: 404,
					message: "Not found",
					name: "MoleculerError"
				});
			});
	});

	it("GET /my-api/test/hello", () => {
		return request(server)
			.get("/my-api/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

});

describe("Test only assets", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
			assets: {
				folder: path.join(__dirname, "..", "assets")
			},
			routes: null
		});
	});

	it("GET /", () => {
		return request(server)
			.get("/")
			.expect(200)
			.expect("Content-Type", "text/html; charset=UTF-8")
			.then(res => {
				expect(res.text).toBe(fs.readFileSync(path.join(__dirname, "..", "assets", "index.html"), "utf8"));
			});
	});

	it("GET /lorem.txt", () => {
		return request(server)
			.get("/lorem.txt")
			.expect(200)
			.expect("Content-Type", "text/plain; charset=UTF-8")
			.then(res => {
				expect(res.text).toBe("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in faucibus sapien, vitae aliquet nisi. Vivamus quis finibus tortor.");
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/test/hello")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					code: 404,
					message: "Not found",
					name: "MoleculerError"
				});
			});

	});

});

describe("Test assets & API route", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
			assets: {
				folder: path.join(__dirname, "..", "assets")
			},
			routes: [{
				path: "/api"
			}]
		});
	});

	it("GET /", () => {
		return request(server)
			.get("/")
			.expect(200)
			.expect("Content-Type", "text/html; charset=UTF-8")
			.then(res => {
				expect(res.text).toBe(fs.readFileSync(path.join(__dirname, "..", "assets", "index.html"), "utf8"));
			});
	});

	it("GET /lorem.txt", () => {
		return request(server)
			.get("/lorem.txt")
			.expect(200)
			.expect("Content-Type", "text/plain; charset=UTF-8")
			.then(res => {
				expect(res.text).toBe("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in faucibus sapien, vitae aliquet nisi. Vivamus quis finibus tortor.");
			});
	});

	it("GET /test/hello", () => {
		return request(server)
			.get("/api/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

});

describe("Test whitelist", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
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
	});

	it("GET /api/test/hello", () => {
		return request(server)
			.get("/api/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api/test/json", () => {
		return request(server)
			.get("/api/test/json")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({ id: 1, name: "Eddie" });
			});
	});

	it("GET /api/test/jsonArray", () => {
		return request(server)
			.get("/api/test/jsonArray")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual([
					{ id: 1, name: "John" },
					{ id: 2, name: "Jane" },
				]);
			});
	});

	it("GET /api/test/greeter", () => {
		return request(server)
			.get("/api/test/greeter")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					code: 404,
					message: "Service 'test.greeter' is not found.",
					name: "ServiceNotFoundError",
					type: null,
					data: {
						action: "test.greeter",
						nodeID: undefined
					}
				});
			});
	});

	it("GET /api/math.add", () => {
		return request(server)
			.get("/api/math.add")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});

	it("GET /api/math.sub", () => {
		return request(server)
			.get("/api/math.sub")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
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

		expect(res.$route).toBeDefined();
		expect(res.$service).toBe(service);

		res.end(`Custom Alias by ${req.$params.name}`);
	});

	let customMiddlewares = [
		jest.fn((req, res, next) => next()),
		jest.fn((req, res, next) => next()),
		"test.greeter"
	];

	beforeAll(() => {
		[ broker, service, server] = setup({
			routes: [{
				path: "/api",
				aliases: {
					"add": "math.add",
					"GET hello": "test.hello",
					"POST /hello": "test.greeter",
					"GET greeter/:name": "test.greeter",
					"POST greeting/:name": "test.greeter",
					"opt-test/:name?": "test.echo",
					"/repeat-test/:args*": "test.echo",
					"GET /": "test.hello",
					"GET custom": customAlias,
					"GET /middleware": customMiddlewares,
					"GET /wrong-middleware": [customMiddlewares[0], customMiddlewares[1]],
					"GET reqres": {
						action: "test.reqres",
						passReqResToParams: true
					},
				}
			}]
		});

		broker.loadService("./test/services/math.service");
	});


	it("GET /api/math.add", () => {
		return request(server)
			.get("/api/math.add")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});


	it("GET /api/add", () => {
		return request(server)
			.get("/api/add")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});

	it("POST /api/add", () => {
		return request(server)
			.post("/api/add")
			.send({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});

	it("GET /api/test/hello", () => {
		return request(server)
			.get("/api/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api/hello", () => {
		return request(server)
			.get("/api/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("POST /api/hello", () => {
		return request(server)
			.post("/api/hello")
			.query({ name: "Ben" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Ben");
			});
	});

	it("GET /api/greeter/Norbert", () => {
		return request(server)
			.get("/api/greeter/Norbert")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Norbert");
			});
	});

	it("POST /api/greeter/Norbert", () => {
		return request(server)
			.post("/api/greeter/Norbert")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					"name": "ServiceNotFoundError",
					"message": "Service 'greeter.Norbert' is not found.",
					"code": 404,
					"type": null,
					"data": {"action": "greeter.Norbert", nodeID: undefined}
				});
			});
	});

	it("POST /api/greeting/Norbert", () => {
		return request(server)
			.post("/api/greeting/Norbert")
			.query({ name: "John" })
			.send({ name: "Adam" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Norbert");
			});
	});

	it("GET opt-test/:name? with name", () => {
		return request(server)
			.get("/api/opt-test/John")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.params).toEqual({
					name: "John"
				});
			});
	});

	it("GET opt-test/:name? without name", () => {
		return request(server)
			.get("/api/opt-test")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.params).toEqual({});
			});
	});

	it("GET repeat-test/:args?", () => {
		return request(server)
			.get("/api/repeat-test/John/Jane/Adam/Walter")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.params).toEqual({
					args: ["John", "Jane", "Adam", "Walter"]
				});
			});
	});

	it("GET /api/", () => {
		return request(server)
			.get("/api")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api/custom", () => {
		return request(server)
			.get("/api/custom")
			.query({ name: "Ben" })
			.expect(200)
			.then(res => {
				expect(res.text).toBe("Custom Alias by Ben");
				expect(customAlias).toHaveBeenCalledTimes(1);
				expect(customAlias).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));
			});
	});

	it("GET /api/middleware", () => {
		return request(server)
			.get("/api/middleware")
			.query({ name: "Ben" })
			.expect(200)
			.then(res => {
				expect(res.body).toBe("Hello Ben");

				expect(customMiddlewares[0]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[0]).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));

				expect(customMiddlewares[1]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[1]).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));
			});
	});

	it("GET /api/wrong-middleware", () => {
		customMiddlewares[0].mockClear();
		customMiddlewares[1].mockClear();

		return request(server)
			.get("/api/wrong-middleware")
			.expect(500)
			.then(res => {
				expect(res.body).toEqual({
					"name": "MoleculerServerError",
					"message": "No alias handler",
					"code": 500,
				});

				expect(customMiddlewares[0]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[0]).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));

				expect(customMiddlewares[1]).toHaveBeenCalledTimes(1);
				expect(customMiddlewares[1]).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));
			});
	});

	it("GET /api/reqres with name", () => {
		return request(server)
			.get("/api/reqres")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					hasReq: true,
					hasRes: true
				});
			});
	});
});

describe("Test REST shorthand aliases", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
			routes: [{
				path: "/api",
				aliases: {
					"REST posts": "posts"
				}
			}]
		});

		broker.loadService("./test/services/posts.service");
	});


	it("GET /api/posts", () => {
		return request(server)
			.get("/api/posts")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.length).toBe(5);
			});
	});


	it("GET /api/posts/2", () => {
		return request(server)
			.get("/api/posts/2")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBeInstanceOf(Object);
				expect(res.body.title).toBeDefined();
				expect(res.body.id).toBe(2);
			});
	});

	it("POST /api/posts", () => {
		return request(server)
			.post("/api/posts")
			.send({ id: 8, title: "Test", content: "Content" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Test");
				expect(res.body.content).toBe("Content");
			});
	});

	it("PUT /api/posts/8", () => {
		return request(server)
			.put("/api/posts/8")
			.send({ title: "Modified" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Modified");
				expect(res.body.content).toBe("Content");
			});
	});

	it("GET /api/posts/8", () => {
		return request(server)
			.get("/api/posts/8")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body.id).toBe(8);
				expect(res.body.title).toBe("Modified");
				expect(res.body.content).toBe("Content");
			});
	});

	it("DELETE /api/posts/8", () => {
		return request(server)
			.delete("/api/posts/8")
			.expect(200);
	});

	it("GET /api/posts/8", () => {
		return request(server)
			.get("/api/posts/8")
			.expect(404);
	});

});

describe("Test alias & whitelist", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
			routes: [{
				path: "/api",
				whitelist: [
					"math.*"
				],
				aliases: {
					"add": "math.add",
					"hello": "test.hello"
				}
			}]
		});

		broker.loadService("./test/services/math.service");
	});

	it("GET /api/add", () => {
		return request(server)
			.get("/api/add")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});

	it("GET /api/hello", () => {
		return request(server)
			.get("/api/hello")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					code: 404,
					message: "Service 'test.hello' is not found.",
					name: "ServiceNotFoundError",
					type: null,
					data: {
						action: "test.hello",
						nodeID: undefined
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

	it("POST /api/test.gretter without bodyParsers", () => {
		[ broker, service, server] = setup({
			routes: [{
				bodyParsers: null
			}]
		});

		return request(server)
			.post("/test.greeter")
			.send({ name: "John" })
			.expect(422)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				/*expect(res.body).toEqual({
					"code": 422,
					"data": [{
						"field": "name",
						"message": "The 'name' field is required!",
						"type": "required"
					}],
					"message": "Parameters validation error!",
					"name": "ValidationError"
				});*/
			});
	});

	it("POST /api/test.gretter with JSON parser", () => {
		[ broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					json: true
				}
			}]
		});

		return request(server)
			.post("/test.greeter")
			.send({ name: "John" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello John");
			});
	});

	it("POST /api/test.gretter with JSON parser & invalid JSON", () => {
		[ broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					json: true
				}
			}]
		});

		return request(server)
			.post("/test.greeter")
			.set("Content-Type", "application/json; charset=utf-8")
			.send("invalid")
			.expect(400)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					"code": 400,
					"type": "entity.parse.failed",
					"message": "Unexpected token i in JSON at position 0",
					"name": "MoleculerError"
				});
			});
	});


	it("POST /api/test.gretter with JSON parser & urlEncoded body", () => {
		[ broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					json: true
				}
			}]
		});

		return request(server)
			.post("/test.greeter")
			.set("Content-Type", "application/x-www-form-urlencoded")
			.send({ name: "Bill" })
			.expect(422);
	});

	it("POST /api/test.gretter with urlencoder parser", () => {
		[ broker, service, server] = setup({
			routes: [{
				bodyParsers: {
					urlencoded: { extended: true }
				}
			}]
		});

		return request(server)
			.post("/test.greeter")
			.set("Content-Type", "application/x-www-form-urlencoded")
			.send({ name: "Adam" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Adam");
			});
	});


});


describe("Test multiple routes", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
		[ broker, service, server] = setup({
			routes: [
				{
					path: "/api1",
					whitelist: [
						"math.*"
					],
					aliases: {
						"main": "math.add"
					}
				},
				{
					path: "/api2",
					whitelist: [
						"test.*"
					],
					aliases: {
						"main": "test.greeter"
					}
				}
			]
		});

		broker.loadService("./test/services/math.service");
	});

	it("GET /api1/test/hello", () => {
		return request(server)
			.get("/api1/test/hello")
			.expect(404);
	});

	it("GET /api2/test/hello", () => {
		return request(server)
			.get("/api2/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
			});
	});

	it("GET /api1/math.add", () => {
		return request(server)
			.get("/api1/math.add")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});

	it("GET /api2/math.add", () => {
		return request(server)
			.get("/api2/math.add")
			.query({ a: 5, b: 8 })
			.expect(404);
	});

	it("GET /api1/main", () => {
		return request(server)
			.get("/api1/main")
			.query({ a: 5, b: 8 })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe(13);
			});
	});

	it("GET /api2/main", () => {
		return request(server)
			.get("/api2/main")
			.query({ name: "Thomas" })
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
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
			[ broker, service, server] = setup({
				routes: [
					{
						path: "/api",
						whitelist: [
							"math.*"
						],
						aliases: {
							"add": "math.add"
						},
						// mappingPolicy: "all" (default value)
					}
				]
			});

			broker.loadService("./test/services/math.service");
		});

		it("GET /api/math.add", () => {
			return request(server)
				.get("/api/math.add")
				.query({ a: 5, b: 8 })
				.expect(200)
				.expect("Content-Type", "application/json; charset=utf-8")
				.then(res => {
					expect(res.body).toBe(13);
				});
		});

		it("GET /api/math/add", () => {
			return request(server)
				.get("/api/math/add")
				.query({ a: 5, b: 8 })
				.expect(200)
				.expect("Content-Type", "application/json; charset=utf-8")
				.then(res => {
					expect(res.body).toBe(13);
				});
		});

		it("GET /api/add", () => {
			return request(server)
				.get("/api/add")
				.query({ a: 5, b: 8 })
				.expect(200)
				.expect("Content-Type", "application/json; charset=utf-8")
				.then(res => {
					expect(res.body).toBe(13);
				});
		});
	});

	describe("'restrict' option", () => {
		beforeAll(() => {
			[ broker, service, server] = setup({
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
		});

		it("GET /api/math.add", () => {
			return request(server)
				.get("/api/math.add")
				.expect(404);
		});

		it("GET /api/math/add", () => {
			return request(server)
				.get("/api/math/add")
				.expect(404);
		});

		it("GET /api/add", () => {
			return request(server)
				.get("/api/add")
				.query({ a: 5, b: 8 })
				.expect(200)
				.expect("Content-Type", "application/json; charset=utf-8")
				.then(res => {
					expect(res.body).toBe(13);
				});
		});
	});

	describe("'restrict' option without aliases", () => {
		beforeAll(() => {
			[ broker, service, server] = setup({
				routes: [
					{
						path: "/",
						mappingPolicy: "restrict"
					}
				]
			});

			broker.loadService("./test/services/math.service");
		});

		it("GET /test", () => {
			return request(server)
				.get("/test")
				.expect(404);
		});

		it("GET /math/add", () => {
			return request(server)
				.get("/math/add")
				.expect(404);
		});

	});
});

describe("Test CORS", () => {
	let broker;
	let service;
	let server;

	beforeAll(() => {
	});

	it("with default settings", () => {
		[ broker, service, server] = setup({
			cors: {}
		});

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("Access-Control-Allow-Origin", "*")
			//.expect("Access-Control-Allow-Credentials", "*")
			//.expect("Access-Control-Expose-Headers", "*")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("with custom global settings (string)", () => {
		[ broker, service, server] = setup({
			cors: {
				origin: "http://localhost:3000",
				exposedHeaders: "X-Response-Time",
				credentials: true
			}
		});

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("Access-Control-Allow-Origin", "http://localhost:3000")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect("Access-Control-Expose-Headers", "X-Response-Time")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("with custom global settings (array)", () => {
		[ broker, service, server] = setup({
			cors: {
				origin: ["http://localhost:3000", "https://localhost:4000"],
				exposedHeaders: ["X-Custom-Header", "X-Response-Time"],
				credentials: true
			}
		});

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("Access-Control-Allow-Origin", "http://localhost:3000, https://localhost:4000")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect("Access-Control-Expose-Headers", "X-Custom-Header, X-Response-Time")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("with custom route settings", () => {
		[ broker, service, server] = setup({
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

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("Access-Control-Allow-Origin", "http://test-server")
			.expect("Access-Control-Expose-Headers", "X-Response-Time")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("preflight request with custom route settings", () => {
		[ broker, service, server] = setup({
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

		return request(server)
			.options("/test/hello")
			.set("Access-Control-Request-Method", "GET")
			.expect(204)
			.expect("Access-Control-Allow-Origin", "http://test-server")
			.expect("Access-Control-Allow-Headers", "X-Rate-Limiting")
			.expect("Access-Control-Allow-Methods", "GET, POST, DELETE")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect("Access-Control-Expose-Headers", "X-Custom-Header, X-Response-Time")
			.expect("Access-Control-Max-Age", "3600")
			.expect("Vary", "Origin")
			.then(res => expect(res.text).toBe(""));
	});

	it("preflight request with default settings", () => {
		[ broker, service, server] = setup({
			cors: {
				allowedHeaders: ["X-Custom-Header", "X-Response-Time"]
			}
		});

		return request(server)
			.options("/test/hello")
			.set("Access-Control-Request-Method", "GET")
			.expect(204)
			.expect("Access-Control-Allow-Origin", "*")
			.expect("Access-Control-Allow-Headers", "X-Custom-Header, X-Response-Time")
			.then(res => expect(res.text).toBe(""));
	});

	it("preflight request with 'Access-Control-Request-Headers'", () => {
		[ broker, service, server] = setup({
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

		return request(server)
			.options("/hello")
			.set("Access-Control-Request-Method", "GET")
			.set("Access-Control-Request-Headers", "X-Rate-Limiting")
			.expect(204)
			.expect("Access-Control-Allow-Origin", "http://localhost:3000")
			.expect("Access-Control-Allow-Headers", "X-Rate-Limiting")
			.expect("Access-Control-Allow-Methods", "GET")
			.expect("Access-Control-Expose-Headers", "X-Custom-Header, X-Response-Time")
			.expect("Vary", "Access-Control-Request-Headers")
			.then(res => expect(res.text).toBe(""));
	});
});

describe("Test Rate Limiter", () => {
	let broker;
	let service;
	let server;
	let clock;

	beforeAll(() => {
		clock = lolex.install();

		[ broker, service, server] = setup({
			rateLimit: {
				window: 10000,
				limit: 3,
				headers: true
			}
		});
	});

	afterAll(() => {
		clock.uninstall();
	});

	it("with headers #1", () => {
		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Rate-Limit-Limit", "3")
			.expect("X-Rate-Limit-Remaining", "2")
			.expect("X-Rate-Limit-Reset", "10000")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("with headers #2", () => {
		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Rate-Limit-Limit", "3")
			.expect("X-Rate-Limit-Remaining", "1")
			.expect("X-Rate-Limit-Reset", "10000")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("with headers #3", () => {
		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Rate-Limit-Limit", "3")
			.expect("X-Rate-Limit-Remaining", "0")
			.expect("X-Rate-Limit-Reset", "10000")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("with headers #4", () => {
		return request(server)
			.get("/test/hello")
			.expect(429)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Rate-Limit-Limit", "3")
			.expect("X-Rate-Limit-Remaining", "0")
			.expect("X-Rate-Limit-Reset", "10000")
			.then(res => expect(res.body).toEqual({
				code: 429,
				message: "Rate limit exceeded",
				name: "RateLimitExceeded"
			}));
	});

	it("with headers #5", () => {
		clock.tick(11 * 1000);

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Rate-Limit-Limit", "3")
			.expect("X-Rate-Limit-Remaining", "2")
			.expect("X-Rate-Limit-Reset", "20000")
			.then(res => expect(res.body).toBe("Hello Moleculer"));
	});

	it("Test StoreFactory", () => {
		let factory = jest.fn();
		[ broker, service, server] = setup({
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
		const broker = new ServiceBroker();
		broker.loadService("./test/services/test.service");

		const beforeCall = jest.fn((ctx, route, req, res) => {
			expect(req.$service).toBeDefined();
			expect(req.$route).toBeDefined();
			expect(req.$params).toBeDefined();
			expect(req.$endpoint).toBeDefined();

			expect(res.$service).toBeDefined();
			expect(res.$route).toBeDefined();

			ctx.meta.custom = "John";
			return Promise.resolve();
		});
		const afterCall = jest.fn((ctx, route, req, res, data) => {
			expect(req.$service).toBeDefined();
			expect(req.$route).toBeDefined();
			expect(req.$params).toBeDefined();
			expect(req.$endpoint).toBeDefined();

			expect(res.$service).toBeDefined();
			expect(res.$route).toBeDefined();

			res.setHeader("X-Custom-Header", "working");
		});

		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					onBeforeCall: beforeCall,
					onAfterCall: afterCall,
				}]
			}
		});
		const server = service.server;

		expect(service.routes[0].onBeforeCall).toBeDefined();
		expect(service.routes[0].onAfterCall).toBeDefined();

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Custom-Header", "working")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
				expect(beforeCall).toHaveBeenCalledTimes(1);
				expect(beforeCall).toHaveBeenCalledWith(jasmine.any(Context), jasmine.any(Object), jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse));

				expect(afterCall).toHaveBeenCalledTimes(1);
				expect(afterCall).toHaveBeenCalledWith(jasmine.any(Context), jasmine.any(Object), jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), "Hello Moleculer");
				expect(afterCall.mock.calls[0][0].meta.custom).toBe("John");
			});
	});

});

describe("Test route middlewares", () => {

	it("should call global & route middlewares", () => {
		const broker = new ServiceBroker();
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

		return request(server)
			.get("/test/hello/")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect("X-Custom-Header", "middleware")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
				expect(mwg).toHaveBeenCalledTimes(1);
				expect(mwg).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));

				expect(mw1).toHaveBeenCalledTimes(1);
				expect(mw1).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));

				expect(mw2).toHaveBeenCalledTimes(1);
				expect(mw2).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));
			});
	});

	it("should return with error if middlewares call next with error", () => {
		const broker = new ServiceBroker();
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

		return request(server)
			.get("/test/hello")
			.expect(500)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					message: "Something went wrong",
					code: 500,
					name: "MoleculerError"
				});
				expect(mw1).toHaveBeenCalledTimes(1);
				expect(mw1).toHaveBeenCalledWith(jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse), jasmine.any(Function));

				expect(mw2).toHaveBeenCalledTimes(0);
			});
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
		const broker = new ServiceBroker();
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

		return request(server)
			.get("/test/hello")
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
				expect(authorize).toHaveBeenCalledTimes(1);
				expect(authorize).toHaveBeenCalledWith(jasmine.any(Context), jasmine.any(Object), jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse));
			});
	});

	it("should give back error", () => {
		const broker = new ServiceBroker();
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

		return request(server)
			.get("/test/hello")
			//.expect(401)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					"message": "Unauthorized",
					"code": 401,
					"type": "ERR_NO_TOKEN",
					"name": "UnAuthorizedError"});
				expect(authorize).toHaveBeenCalledTimes(1);
				expect(authorize).toHaveBeenCalledWith(jasmine.any(Context), jasmine.any(Object), jasmine.any(http.IncomingMessage), jasmine.any(http.ServerResponse));
			});
	});

});

describe("Test onError handlers", () => {

	it("should return with JSON error object", () => {
		const broker = new ServiceBroker();
		const service = broker.createService(ApiGateway, {
			settings: {
				routes: [{
					path: "/api"
				}]
			}
		});
		const server = service.server;

		return request(server)
			.get("/api/test/hello")
			.expect(404)
			.expect("Content-Type", "application/json; charset=utf-8")
			.then(res => {
				expect(res.body).toEqual({
					code: 404,
					data: {
						action: "test.hello"
					},
					message: "Service 'test.hello' is not found.",
					name: "ServiceNotFoundError",
					type: null
				});
			});
	});

	it("should return with global error handler response", () => {
		const broker = new ServiceBroker();
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

		return request(server)
			.get("/api/test/hello")
			.expect(501)
			.expect("Content-Type", "text/plain")
			.then(res => {
				expect(res.text).toBe("Global error: Service 'test.hello' is not found.");
			});
	});

	it("should return with route error handler response", () => {
		const broker = new ServiceBroker();
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

		return request(server)
			.get("/api/test/hello")
			.expect(500)
			.expect("Content-Type", "text/plain")
			.then(res => {
				expect(res.text).toBe("Route error: Service 'test.hello' is not found.");
			});
	});

});


describe("Test lifecycle events", () => {

	it("`created` with only HTTP", () => {
		const broker = new ServiceBroker();

		const service = broker.createService(ApiGateway);
		expect(service.isHTTPS).toBe(false);
	});

	it("`created` with HTTPS", () => {
		const broker = new ServiceBroker();

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
		const broker = new ServiceBroker();
		const service = broker.createService(ApiGateway);
		const server = service.server;

		server.listen = jest.fn();

		service.schema.started.call(service);

		expect(server.listen).toHaveBeenCalledTimes(1);
		expect(server.listen).toHaveBeenCalledWith(service.settings.port, service.settings.ip, jasmine.any(Function));
	});

	it("`stopped`", () => {
		const broker = new ServiceBroker();
		const service = broker.createService(ApiGateway);
		const server = service.server;
		server.listen();

		const oldClose = server.close;
		server.close = jest.fn();

		service.schema.stopped.call(service);

		expect(server.close).toHaveBeenCalledTimes(1);
		expect(server.close).toHaveBeenCalledWith(jasmine.any(Function));

		oldClose.call(server);
	});
});

describe("Test middleware mode", () => {
	let broker;
	let app;
	let service;
	let nextHandler = jest.fn((req, res) => res.sendStatus(200));

	beforeAll(() => {

		broker = new ServiceBroker();
		broker.loadService("./test/services/test.service");

		service = broker.createService(ApiGateway, {
			settings: {
				middleware: true,
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
			.expect(200)
			.then(res => {
				expect(res.body).toBe("Hello Moleculer");
				expect(nextHandler).toHaveBeenCalledTimes(0);
			});
	});

	it("GET /missing", () => {
		return request(app)
			.get("/missing")
			.expect(200)
			.then(res => {
				expect(res.text).toBe("OK");
				expect(nextHandler).toHaveBeenCalledTimes(1);
			});
	});
});
