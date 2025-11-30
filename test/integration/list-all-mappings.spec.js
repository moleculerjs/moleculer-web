"use strict";

const { ServiceBroker } = require("moleculer");
const ApiGateway = require("../../index");

describe("Test 'listAllMappings' action", () => {
	let broker;

	beforeAll(async () => {
		broker = new ServiceBroker({
			logger: false,
			nodeID: "test-node"
		});

		// Create dummy services
		broker.createService({
			name: "users",
			actions: {
				list: {
					rest: "GET /",
					handler() { return []; }
				},
				get: {
					rest: "GET /:id",
					handler() { return {}; }
				},
				create: {
					rest: "POST /",
					visibility: "published",
					handler() { return {}; }
				},
				secret: {
					visibility: "private",
					handler() { return "ssh"; }
				}
			}
		});

		broker.createService({
			name: "posts",
			actions: {
				find: {
					handler() { return []; }
				},
				get: {
					handler() { return {}; }
				}
			}
		});

		broker.createService({
			name: "$node",
			actions: {
				health: {
					handler() { return "OK"; }
				}
			}
		});

		broker.createService(ApiGateway, {
			settings: {
				internalServiceSpecialChar: "~",
				routes: [
					// Route 1: Explicit aliases
					{
						path: "/api",
						aliases: {
							"GET /users": "users.list",
							"POST /users": "users.create"
						}
					},
					// Route 2: Auto aliases (mappingPolicy: all)
					{
						path: "/rpc",
						mappingPolicy: "all",
						whitelist: ["**"]
					},
					// Route 3: Restricted aliases
					{
						path: "/restricted",
						whitelist: ["users.list"]
					}
				]
			}
		});

		await broker.start();
	});

	afterAll(async () => {
		await broker.stop();
	});

	it("should list all mappings including aliases and auto-mapped routes", async () => {
		const res = await broker.call("api.listAllMappings");

		expect(res).toBeInstanceOf(Array);

		// 1. Check explicit aliases (Route /api)
		// Alias path is relative to route path and normalized (no leading slash)
		const userListAlias = res.find(item => item.path === "users" && item.methods === "GET" && item.routePath === "/api");
		expect(userListAlias).toBeDefined();
		expect(userListAlias.fullPath).toBe("/api/users");
		expect(userListAlias.actionName).toBe("users.list");

		const userCreateAlias = res.find(item => item.path === "users" && item.methods === "POST" && item.routePath === "/api");
		expect(userCreateAlias).toBeDefined();
		expect(userCreateAlias.fullPath).toBe("/api/users");
		expect(userCreateAlias.actionName).toBe("users.create");

		// 2. Check auto-mapped routes (Route /rpc)
		// posts.find -> /rpc/posts/find
		const postsFindMap = res.find(item => item.fullPath === "/rpc/posts/find");
		expect(postsFindMap).toBeDefined();
		expect(postsFindMap.actionName).toBe("posts.find");
		expect(postsFindMap.path).toBe("posts/find");
		expect(postsFindMap.methods).toBe("*");

		// 3. System actions like $node.* are filtered out by default in listAllMappings
		const nodeHealthMap = res.find(item => item.actionName === "$node.health");
		expect(nodeHealthMap).toBeUndefined();

		// 4. Check visibility (private actions should not be listed)
		const secretAction = res.find(item => item.actionName === "users.secret");
		expect(secretAction).toBeUndefined();
	});

	it("should group results by route", async () => {
		const res = await broker.call("api.listAllMappings", { grouping: true });

		expect(res).toBeInstanceOf(Array);
		expect(res.length).toBe(3); // 3 routes

		const apiRoute = res.find(r => r.path === "/api");
		expect(apiRoute).toBeDefined();
		expect(apiRoute.aliases.length).toBeGreaterThanOrEqual(2);

		const rpcRoute = res.find(r => r.path === "/rpc");
		expect(rpcRoute).toBeDefined();
		// Should contain posts.*, users.*, $node.* (if whitelisted)
		const postsFind = rpcRoute.aliases.find(a => a.actionName === "posts.find");
		expect(postsFind).toBeDefined();
	});

	it("should include action schema if requested", async () => {
		const res = await broker.call("api.listAllMappings", { withActionSchema: true });

		const userList = res.find(item => item.actionName === "users.list");
		expect(userList).toBeDefined();
		expect(userList.action).toBeDefined();
		expect(userList.action.rest).toBe("GET /");
	});

	it("should respect whitelist in mappingPolicy: all", async () => {
		// Route 3 (/restricted) only whitelists users.list
		const res = await broker.call("api.listAllMappings");

		// Find mappings for /restricted route
		const restrictedMappings = res.filter(item => item.routePath === "/restricted");

		// Should contain users.list
		const userList = restrictedMappings.find(item => item.actionName === "users.list");
		expect(userList).toBeDefined();
		expect(userList.fullPath).toBe("/restricted/users/list");
		expect(userList.path).toBe("users/list");

		// Should NOT contain posts.find
		const postsFind = restrictedMappings.find(item => item.actionName === "posts.find");
		expect(postsFind).toBeUndefined();
	});
});
