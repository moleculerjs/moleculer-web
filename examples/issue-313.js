const { ServiceBroker } = require("moleculer");
const ApiGatewayService = require("../index");
const http = require("http");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const broker = new ServiceBroker({
	logger: false,
});

broker.createService({
	name: "file",
	actions: {
		save: {
			handler(ctx) {
				console.log("File received");
				return true;
			},
		},
	},
});

const gw = broker.createService(ApiGatewayService, {
	name: "gateway",
	settings: {
		port: 0,
		routes: [
			{
				path: "/upload",

				aliases: {
					"POST /": {
						type: "multipart",
						busboyConfig: {
							limits: {
								files: 1,
								fileSize: 1e3,
							},
						},
						action: "file.save",
					},
				},
			},
		],
	},
});

broker.start().then(() => {
	return new Promise((resolve) => {
		const form = new FormData();
		form.append(
			"file",
			fs.createReadStream(path.join(__dirname, "2k_bytes.log"))
		);

		const req = http.request(
			{
				host: "127.0.0.1",
				port: gw.server.address().port,
				path: "/upload",
				method: "POST",
				headers: form.getHeaders(),
			},
			(res) => {
				let data = "";
				res.on("error", console.error);
				res.on("data", (chunk) => {
					data += chunk.toString();
				});
				res.on("end", () => {
					console.log(res.statusCode, data);
					resolve();
				});
			}
		);

		req.on("error", (err) => {
			console.log("req error", err);
			// debugger
		});
		form.pipe(req);
	});
});

// Event 'uncaughtException'
process.on("uncaughtException", (error, source) => {
	console.log("uncaught hit");
	console.error(error, source);
	process.exit(1);
});
