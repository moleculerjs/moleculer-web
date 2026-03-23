const ApiGateway = require("./index");
const { ServiceBroker } = require("moleculer");

async function main() {
	const broker = new ServiceBroker({ logger: false });
	broker.loadService("./test/services/test.service");

	const service = broker.createService({
		mixins: [ApiGateway],
		settings: {
			routes: [{
				path: "/api",
				autoAliases: true,
				blacklist: ["test.greeter"]
			}]
		}
	});

	await broker.start();
	const route = service.routes[0];
	console.log("Route path:", route.path);
	console.log("Alias count:", route.aliases ? route.aliases.length : 0);
	if (route.aliases) {
		for (const a of route.aliases) {
			console.log("  Alias:", a.method, a.path, "->", a.action);
		}
	}
	await broker.stop();
}
main().catch(e => console.error(e.message, e.stack));
