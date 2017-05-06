"use strict";

const request = require("supertest");
const ApiGateway = require("../../src");
const { ServiceBroker } = require("Moleculer");


describe("Test default settings", () => {
	let broker;
	let service;
	let server;

	beforeEach(() => {
		broker = new ServiceBroker();
		broker.loadService("./test/services/math.service");

		service = broker.createService(ApiGateway);
		server = service.server;
	});

	it("GET /math/add", () => {
		return request(server)
			.get("/math/add")
			.query({a: 5, b: 4 })
			.expect("Content-Type", "application/json")
			.expect(200)
			.then(res => {
				expect(res.body).toBe(9);
			});
	});

	it("GET /", () => {
		return request(server)
			.get("/")
			.expect(404, "Not found")
			.then(res => {
				expect(res.body).toEqual({});
			});
	});

	it("GET /other/action", () => {
		return request(server)
			.get("/other/action")
			.expect("Content-Type", "application/json")
			.expect(501)
			.then(res => {
				expect(res.body).toEqual({
					"code": 501, 
					"message": "Action 'other.action' is not available!", 
					"name": "ServiceNotFoundError"
				});
			});
	});

	it("POST /math/add with query", () => {
		return request(server)
			.post("/math/add")
			.query({a: 5, b: 4 })
			.expect("Content-Type", "application/json")
			.expect(200)
			.then(res => {
				expect(res.body).toBe(9);
			});
	});	

	it("POST /math/add with body", () => {
		return request(server)
			.post("/math/add")
			.send({a: 10, b: 8 })
			.expect("Content-Type", "application/json")
			.expect(200)
			.then(res => {
				expect(res.body).toBe(18);
			});
	});	

	it("POST /math/add with query & body", () => {
		return request(server)
			.post("/math/add")
			.query({a: 5, b: 4 })
			.send({a: 10, b: 8 })
			.expect("Content-Type", "application/json")
			.expect(200)
			.then(res => {
				expect(res.body).toBe(18);
			});
	});	
});