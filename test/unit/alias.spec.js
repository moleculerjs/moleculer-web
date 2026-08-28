"use strict";

const Alias = require("../../src/alias");
const { MoleculerError } = require("moleculer").Errors;

describe("Test Alias class", () => {
	const mockService = {
		logger: {
			warn: jest.fn(),
			error: jest.fn()
		}
	};
	const mockRoute = {
		path: "/api",
		opts: {}
	};

	describe("Constructor & Properties", () => {
		it("should create an alias with string definition", () => {
			const alias = new Alias(mockService, mockRoute, "GET /users/:id", "users.get");
			expect(alias.service).toBe(mockService);
			expect(alias.route).toBe(mockRoute);
			expect(alias.method).toBe("GET");
			expect(alias.path).toBe("users/:id");
			expect(alias.fullPath).toBe("/api/users/:id");
			expect(alias.action).toBe("users.get");
			expect(alias.type).toBe("call");
		});

		it("should create an alias with wildcard method if not specified", () => {
			const alias = new Alias(mockService, mockRoute, "/users/:id", "users.get");
			expect(alias.method).toBe("*");
			expect(alias.path).toBe("users/:id");
			expect(alias.fullPath).toBe("/api/users/:id");
		});

		it("should create an alias with action type prefix", () => {
			const alias = new Alias(mockService, mockRoute, "POST /upload", "multipart:file.save");
			expect(alias.type).toBe("multipart");
			expect(alias.action).toBe("file.save");
			expect(typeof alias.handler).toBe("function");
		});

		it("should create an alias with function handler", () => {
			const fn = jest.fn();
			const alias = new Alias(mockService, mockRoute, "GET /custom", fn);
			expect(alias.handler).toBe(fn);
			expect(alias.action).toBeNull();
		});

		it("should create an alias with array of middlewares", () => {
			const mw1 = (req, res, next) => next();
			const alias = new Alias(mockService, mockRoute, "GET /mw", [mw1, "users.list"]);
			expect(alias.action).toBe("users.list");
			expect(typeof alias.handler).toBe("function");
		});
	});

	describe("isMethod", () => {
		it("should match wildcard method", () => {
			const alias = new Alias(mockService, mockRoute, "/test", "test.action");
			expect(alias.isMethod("GET")).toBe(true);
			expect(alias.isMethod("POST")).toBe(true);
		});

		it("should match specific method", () => {
			const alias = new Alias(mockService, mockRoute, "POST /test", "test.action");
			expect(alias.isMethod("POST")).toBe(true);
			expect(alias.isMethod("GET")).toBe(false);
		});
	});

	describe("match", () => {
		it("should match static url and return params", () => {
			const alias = new Alias(mockService, mockRoute, "GET /hello", "test.hello");
			expect(alias.match("/api/hello")).toEqual({});
			expect(alias.match("/api/other")).toBe(false);
		});

		it("should match url with parameters", () => {
			const alias = new Alias(mockService, mockRoute, "GET /users/:id", "users.get");
			expect(alias.match("/api/users/123")).toEqual({ id: "123" });
			expect(alias.match("/api/users/john-doe")).toEqual({ id: "john-doe" });
			expect(alias.match("/api/posts/123")).toBe(false);
		});
	});

	describe("compile", () => {
		it("should compile a path without parameters", () => {
			const alias = new Alias(mockService, mockRoute, "GET /users", "users.list");
			expect(alias.compile()).toBe("/api/users");
			expect(alias.compile({})).toBe("/api/users");
		});

		it("should compile a path with single parameter", () => {
			const alias = new Alias(mockService, mockRoute, "GET /users/:id", "users.get");
			expect(alias.compile({ id: "42" })).toBe("/api/users/42");
		});

		it("should compile parameters converted to string (number, boolean)", () => {
			const alias = new Alias(mockService, mockRoute, "GET /users/:id/active/:active", "users.get");
			expect(alias.compile({ id: 100, active: true })).toBe("/api/users/100/active/true");
		});

		it("should compile multiple parameters", () => {
			const alias = new Alias(
				mockService,
				mockRoute,
				"GET /posts/:postId/comments/:commentId",
				"posts.comment"
			);
			expect(alias.compile({ postId: "post-1", commentId: "com-2" })).toBe(
				"/api/posts/post-1/comments/com-2"
			);
		});

		it("should compile path with optional group parameters", () => {
			const alias = new Alias(mockService, mockRoute, "GET /items{/:category}", "items.list");
			expect(alias.compile({})).toBe("/api/items");
			expect(alias.compile({ category: "books" })).toBe("/api/items/books");
		});

		it("should throw MoleculerError with MISSING_PARAMETERS when required parameter is missing", () => {
			const alias = new Alias(mockService, mockRoute, "GET /users/:id", "users.get");
			expect(() => alias.compile()).toThrow(MoleculerError);
			expect(() => alias.compile({})).toThrow(MoleculerError);

			try {
				alias.compile({});
			} catch (err) {
				expect(err.code).toBe(400);
				expect(err.type).toBe("MISSING_PARAMETERS");
			}
		});
	});
});
