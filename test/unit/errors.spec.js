"use strict";

let errors = require("../../src/errors");


describe("Test Errors", () => {

	it("test InvalidRequestBodyError", () => {
		let err = new errors.InvalidRequestBodyError({ a: 5 }, "Problem");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.InvalidRequestBodyError);
		expect(err.code).toBe(400);
		expect(err.name).toBe("InvalidRequestBodyError");
		expect(err.message).toBe("Invalid request body");
		expect(err.data).toEqual({
			body: { a: 5 },
			error: "Problem"
		});
	});

	it("test InvalidResponseType", () => {
		let err = new errors.InvalidResponseType("person");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.InvalidResponseType);
		expect(err.code).toBe(500);
		expect(err.name).toBe("InvalidResponseType");
		expect(err.message).toBe("Invalid response type 'person'");
	});

});