module.exports = {
	name: "chat",
	actions: {
		postMessage: {
			params: {
				message: "string",
				user: "string",
			},
			handler(context) {
				const { params } = context;
				context.emit("chat.message", params);
			},
		},
	},
};
