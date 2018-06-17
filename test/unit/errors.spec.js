"use strict";

let errors = require("../../src/errors");
let { MoleculerClientError } = require("moleculer").Errors;

describe("Test Errors", () => {

	it("test InvalidRequestBodyError", () => {
		let err = new errors.InvalidRequestBodyError({ a: 5 }, "Problem");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.InvalidRequestBodyError);
		expect(err.code).toBe(400);
		expect(err.type).toBe("INVALID_REQUEST_BODY");
		expect(err.name).toBe("InvalidRequestBodyError");
		expect(err.message).toBe("Invalid request body");
		expect(err.data).toEqual({
			body: { a: 5 },
			error: "Problem"
		});
	});

	it("test InvalidResponseTypeError", () => {
		let err = new errors.InvalidResponseTypeError("person");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.InvalidResponseTypeError);
		expect(err.code).toBe(500);
		expect(err.type).toBe("INVALID_RESPONSE_TYPE");
		expect(err.name).toBe("InvalidResponseTypeError");
		expect(err.message).toBe("Invalid response type 'person'");
	});

	it("test UnAuthorizedError", () => {
		let err = new errors.UnAuthorizedError("ERR_NO_TOKEN", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.UnAuthorizedError);
		expect(err.code).toBe(401);
		expect(err.type).toBe("ERR_NO_TOKEN");
		expect(err.name).toBe("UnAuthorizedError");
		expect(err.message).toBe("Unauthorized");
		expect(err.data).toEqual({ a: 5});
	});

	it("test ForbiddenError", () => {
		let err = new errors.ForbiddenError("ERR_NO_LOGGED_IN", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ForbiddenError);
		expect(err.code).toBe(403);
		expect(err.type).toBe("ERR_NO_LOGGED_IN");
		expect(err.name).toBe("ForbiddenError");
		expect(err.message).toBe("Forbidden");
		expect(err.data).toEqual({ a: 5});
	});

	it("test BadRequestError", () => {
		let err = new errors.BadRequestError("ERR_NO_REQUEST_BODY", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.BadRequestError);
		expect(err.code).toBe(400);
		expect(err.type).toBe("ERR_NO_REQUEST_BODY");
		expect(err.name).toBe("BadRequestError");
		expect(err.message).toBe("Bad request");
		expect(err.data).toEqual({ a: 5});
	});

	it("test RateLimitExceeded", () => {
		let err = new errors.RateLimitExceeded("ERR_RATE_LIMIT", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(MoleculerClientError);
		expect(err).toBeInstanceOf(errors.RateLimitExceeded);
		expect(err.code).toBe(429);
		expect(err.type).toBe("ERR_RATE_LIMIT");
		expect(err.name).toBe("RateLimitExceeded");
		expect(err.message).toBe("Rate limit exceeded");
		expect(err.data).toEqual({ a: 5});
	});
});
