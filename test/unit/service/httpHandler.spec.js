"use strict";

const HttpHandler = () => require("../../../src/index").methods.httpHandler;

const MockLogger = () => Object.assign({
	info: jest.fn(),
	error: jest.fn(),
	warning: jest.fn(),
	debug: jest.fn(),
	trace: jest.fn(),
});
const MockContext = ({ action = jest.fn(), serve, settings } = {}) => Object.assign({
	actions: {
		rest: action,
	},
	settings: { ...require("../../../src/index").settings, ...settings },
	errorHandler: require("../../../src/index").methods.errorHandler,
	logger: MockLogger(),
	sendError: jest.fn(),
	send404: jest.fn(),
	corsHandler: jest.fn(() => false),
	serve,
});

const MockRequest = ({ headers = {} } = {}) => Object.assign(jest.fn(), { headers });

const makeFakeError = (message, code) => {
	const error = new Error(message);
	error.code = code;
	return error;
};

const setup = (headers) =>{
	const handler = HttpHandler();
	const req = MockRequest(headers);
	const res = jest.fn();
	const next = jest.fn();
	return { handler, req, res, next };
};

describe("WebGateway", () => {
	describe("methods", () => {
		describe("httpHandler", () => {
			it("is a function", () => {
				expect(typeof HttpHandler()).toEqual("function");
			});

			it("sets $startTime of the request to the current process.hrtime()", async () => {
				const { handler, req, res, next } = setup();
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce()
				});

				await handler.bind(context)(req, res, next);

				expect(req.$startTime[0]).toBeLessThanOrEqual(process.hrtime()[0]);
			});

			it("references the context via req.$service and res.$service", async () => {
				const { handler, req, res, next } = setup();
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce()
				});

				await handler.bind(context)(req, res, next);

				expect(req.$service).toEqual(context);
			});

			it("references the next middleware callback via req.$next", async () => {
				const { handler, req, res, next } = setup();
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce()
				});

				await handler.bind(context)(req, res, next);

				expect(req.$next).toEqual(next);
			});

			it("ensures that res.locals is an object if undefined", async () => {
				const { handler, req, res, next } = setup();
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce()
				});

				await handler.bind(context)(req, res, next);

				expect(res.locals).toEqual({});
			});

			it("maintains the requestId of a \"x-request-id\" header if present", async () => {
				const { handler, req, res, next } = setup({ headers: { "x-request-id": "foobar" } });
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce()
				});

				await handler.bind(context)(req, res, next);

				expect(context.actions.rest.mock.calls[0]).toEqual([{ req, res }, { requestID: "foobar" }]);
			});

			it("maintains the requestId of a \"x-correlation-id\" header if present", async () => {
				const { handler, req, res, next } = setup({
					headers: {
						"x-request-id": "foobar",
						"x-correlation-id": "barfoo"
					}
				});
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce()
				});

				await handler.bind(context)(req, res, next);

				expect(context.actions.rest.mock.calls[0]).toEqual([{ req, res }, { requestID: "barfoo" }]);
			});

			it("resolves if the rest.action did resolve with an object result", async () => {
				const { handler, req, res, next } = setup();
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce({ foo: "bar" })
				});

				await handler.bind(context)(req, res, next);

				expect(context.send404.mock.calls.length).toEqual(0);
			});

			it("sends a 404 response if the request could not be routed and serving static assets is not configured", async () => {
				const { handler, req, res, next } = setup();
				const context = MockContext({
					action: jest.fn().mockResolvedValueOnce(null),
				});

				await handler.bind(context)(req, res, next);

				expect(context.send404.mock.calls[0]).toEqual([req, res]);
			});

			it("resolves if the request could not be routed and instead a static asset was served", async () => {
				const { handler, req, res, next } = setup();
				let context = MockContext({
					action: jest.fn().mockResolvedValueOnce(null),
					serve: jest.fn(),
				});

				await handler.bind(context)(req, res, next);

				expect(context.send404.mock.calls.length).toEqual(0);
				expect(context.serve.mock.calls[0][0]).toEqual(req);
				expect(context.serve.mock.calls[0][1]).toEqual(res);
			});

			it("responds with 404 if the request could not be routed and serving a static asset encountered an error", async () => {
				const { handler, req, res, next } = setup();
				let context = MockContext({
					action: jest.fn().mockResolvedValueOnce(null),
					serve: jest.fn(),
				});
				const error = new Error("Something went wrong while serving a static asset");

				await handler.bind(context)(req, res, next);
				context.serve.mock.calls[0][2](error);

				expect(context.send404.mock.calls[0]).toEqual([req, res]);
				expect(context.logger.debug.mock.calls[0]).toEqual([error]);
			});

			it("logs and responds with an error if the rest action rejects", async () => {
				const { handler, req, res, next } = setup();
				const error = makeFakeError("Something went wrong while invoking the rest action", 503);
				const context = MockContext({
					action: jest.fn().mockRejectedValueOnce(error)
				});

				await handler.bind(context)(req, res, next);

				expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
				expect(context.logger.error.mock.calls[0]).toEqual(["   Request error!", error.name, ":", error.message, "\n", error.stack, "\nData:", error.data]);
			});

			it("responds with an error but does not log the error if the rest action rejects, the error code is 400 and settings.log4XXResponses is false", async () => {
				const { handler, req, res, next } = setup();
				const error = makeFakeError("Something went wrong while invoking the rest action", 400);
				const context = MockContext({
					action: jest.fn().mockRejectedValueOnce(error),
					settings: {
						log4XXResponses: false
					}
				});

				await handler.bind(context)(req, res, next);

				expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
				expect(context.logger.error.mock.calls.length).toEqual(0);
			});

			it("logs and responds with an error if the rest action rejects, the error code is 399 and settings.log4XXResponses is false", async () => {
				const { handler, req, res, next } = setup();
				const error = makeFakeError("Something went wrong while invoking the rest action", 399);
				const context = MockContext({
					action: jest.fn().mockRejectedValueOnce(error),
					settings: {
						log4XXResponses: false
					}
				});

				await handler.bind(context)(req, res, next);

				expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
				expect(context.logger.error.mock.calls.length).toEqual(1);
			});

			it("logs and responds with an error if the rest action rejects, the error code is 500 and settings.log4XXResponses is false", async () => {
				const { handler, req, res, next } = setup();
				const error = makeFakeError("Something went wrong while invoking the rest action", 500);
				const context = MockContext({
					action: jest.fn().mockRejectedValueOnce(error),
					settings: {
						log4XXResponses: false
					}
				});

				await handler.bind(context)(req, res, next);

				expect(context.sendError.mock.calls[0]).toEqual([req, res, error]);
				expect(context.logger.error.mock.calls.length).toEqual(1);
			});
		});
	});
});
