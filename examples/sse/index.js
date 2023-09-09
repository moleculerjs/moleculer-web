"use strict";

const path = require("path");
const { ServiceBroker, Errors } = require("moleculer");
const ApiGatewayService = require("../../index");
const ChatService = require("./chat.service");

const { MoleculerError } = Errors;

const SSE_RETRY_TIMEOUT = 15000; // 15 seconds
const PORT = 3000;
const HOST = "0.0.0.0";
const SSE_HEADERS = {
	Connection: "keep-alive",
	"Content-Type": "text/event-stream",
	"Cache-Control": "no-cache",
};

// Create broker
const broker = new ServiceBroker({
	logger: console,
	metrics: true,
	validation: true,
});

broker.createService(ChatService);

// Load API Gateway
broker.createService({
	name: "sse.gateway",
	mixins: [ApiGatewayService],
	settings: {
		port: PORT,

		ip: HOST,

		assets: {
			folder: path.join(__dirname, "assets"),
		},

		routes: [
			{
				path: "/api/chat",
				aliases: {
					"POST message": "chat.postMessage",
					"GET message"(request, response) {
						response.writeHead(200, SSE_HEADERS);
						response.$service.addSSEListener(
							response,
							"chat.message"
						);
					},
				},
			},
		],
	},

	events: {
		"chat.sse*"(context) {
			this.handleSSE(context);
		},
	},

	methods: {
		handleSSE(context) {
			const { eventName, params } = context;
			const event = eventName.replace("sse.", "");
			if (!this.sseListeners.has(event)) return;
			const listeners = this.sseListeners.get(event);
			for (const listener of listeners.values()) {
				const id = this.sseIds.get(listener) || 0;
				const message = this.createSSEMessage(params, event, id);
				listener.write(message);
				this.sseIds.set(listener, id + 1);
			}
		},

		addSSEListener(stream, event) {
			if (!stream.write)
				throw new MoleculerError("Only writable can listen to SSE.");
			const listeners = this.sseListeners.get(event) || new Set();
			listeners.add(stream);
			this.sseListeners.set(event, listeners);
			this.sseIds.set(stream, 0);
			stream.on("close", () => {
				this.sseIds.delete(stream);
				listeners.delete(stream);
			});
		},

		createSSEMessage(data, event, id) {
			return `event: ${event}\ndata: ${JSON.stringify(
				data
			)}\nid: ${id}\nretry: ${this.sseRetry}\n\n`;
		},
	},

	started() {
		this.sseListeners = new Map();
		this.sseIds = new WeakMap();
		this.sseRetry = SSE_RETRY_TIMEOUT;
	},

	stopped() {
		for (const listeners of this.sseListeners.values()) {
			for (const listener of listeners.values()) {
				if (listener.end) listener.end();
				listeners.delete(listener);
			}
		}
	},
});

// Start server
broker.start();
