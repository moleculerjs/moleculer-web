"use strict";

const HttpHandler = () => require("../../../src/index").methods.httpHandler;
const MockLogger = () => Object.assign({
	info: jest.fn(),
	error: jest.fn(),
	warning: jest.fn(),
	debug: jest.fn(),
	trace: jest.fn(),
});
const MockContext = () => Object.assign({
	actions: {
		rest: jest.fn(),
	},
	settings: require("../../../src/index").settings,
	logger: MockLogger(),
	sendError: jest.fn(),
	send404: jest.fn(),
});

const MockRequest = () => Object.assign(jest.fn(), {headers: {}});

describe("WebGateway", () => {
	describe("methods", () => {
		describe("httpHandler", () => {
			it("is a function", () => {
				expect(typeof HttpHandler()).toEqual("function");
			});

			it("sets $startTime of the request to the current process.hrtime()", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve());

				return handler.bind(context)(req, res, next).then(() => {
					expect(req.$startTime[0]).toBeLessThanOrEqual(process.hrtime()[0]);
				});
			});

			it("references the context via req.$service and res.$service", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve());

				return handler.bind(context)(req, res, next).then(() => {
					expect(req.$service).toEqual(context);
					expect(res.$service).toEqual(context);
				});
			});

			it("references the next middleware callback via req.$next", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve());

				return handler.bind(context)(req, res, next).then(() => {
					expect(req.$next).toEqual(next);
				});
			});

			it("ensures that res.locals is an object if undefined", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve());

				return handler.bind(context)(req, res, next).then(() => {
					expect(res.locals).toEqual({});
				});
			});

			it("maintains the requestId of a \"x-request-id\" header if present", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				req.headers["x-request-id"] = "foobar";
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve());

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.actions.rest.mock.calls[0]).toEqual([{req, res}, {requestID: "foobar"}]);
				});
			});

			it("maintains the requestId of a \"x-correlation-id\" header if present", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				req.headers["x-request-id"] = "foobar";
				req.headers["x-correlation-id"] = "barfoo";
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve());

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.actions.rest.mock.calls[0]).toEqual([{req, res}, {requestID: "barfoo"}]);
				});
			});

			it("resolves if the rest.action did resolve with an object result", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve({foo: "bar"}));

				return handler.bind(context)(req, res, next).then(result => {
					expect(context.send404.mock.calls.length).toEqual(0);
				});
			});

			it("sends a 404 response if the request could not be routed and serving static assets is not configured", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.actions.rest.mockReturnValueOnce(Promise.resolve(null));

				return handler.bind(context)(req, res, next).then(result => {
					expect(context.send404.mock.calls[0]).toEqual([req, res]);
				});
			});

			it("resolves if the request could not be routed and instead a static asset was served", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				let context = MockContext();
				context.serve = jest.fn();
				context.actions.rest.mockReturnValueOnce(Promise.resolve(null));

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.send404.mock.calls.length).toEqual(0);
					expect(context.serve.mock.calls[0][0]).toEqual(req);
					expect(context.serve.mock.calls[0][1]).toEqual(res);
				});
			});

			it("responds with 404 if the request could not be routed and serving a static asset encountered an error", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				let context = MockContext();
				const error = new Error("Something went wrong while serving a static asset");
				context.serve = jest.fn();
				context.actions.rest.mockReturnValueOnce(Promise.resolve(null));

				return handler.bind(context)(req, res, next).then(() => {
					context.serve.mock.calls[0][2](error);
					expect(context.send404.mock.calls[0]).toEqual([req, res]);
					expect(context.logger.debug.mock.calls[0]).toEqual([error]);
				});
			});

			it("logs and responds with an error if the rest action rejects", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				let error = new Error("Something went wrong while invoking the rest action");
				error.code = 419;
				context.actions.rest.mockReturnValueOnce(Promise.reject(error));

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
					expect(context.logger.error.mock.calls[0]).toEqual(["   Request error!", error.name, ":", error.message, "\n", error.stack, "\nData:", error.data]);
				});
			});

			it("responds with an error but does not log the error if the rest action rejects, the error code is 400 and settings.log4XXResponses is false", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.settings.log4XXResponses = false;
				let error = new Error("Something went wrong while invoking the rest action");
				error.code = 400;
				context.actions.rest.mockReturnValueOnce(Promise.reject(error));

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
					expect(context.logger.error.mock.calls.length).toEqual(0);
				});
			});

			it("logs and responds with an error if the rest action rejects, the error code is 399 and settings.log4XXResponses is false", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.settings.log4XXResponses = false;
				let error = new Error("Something went wrong while invoking the rest action");
				error.code = 399;
				context.actions.rest.mockReturnValueOnce(Promise.reject(error));

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
					expect(context.logger.error.mock.calls.length).toEqual(1);
				});
			});

			it("logs and responds with an error if the rest action rejects, the error code is 500 and settings.log4XXResponses is false", () => {
				const handler = HttpHandler();
				const req = MockRequest();
				const res = jest.fn();
				const next = jest.fn();
				const context = MockContext();
				context.settings.log4XXResponses = false;
				let error = new Error("Something went wrong while invoking the rest action");
				error.code = 500;
				context.actions.rest.mockReturnValueOnce(Promise.reject(error));

				return handler.bind(context)(req, res, next).then(() => {
					expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
					expect(context.logger.error.mock.calls.length).toEqual(1);
				});
			});
		});
	});
});
