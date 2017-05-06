"use strict";

let fs = require("fs");
let path = require("path");

let { ServiceBroker } = require("moleculer");
let MemoryCacher = require("moleculer").Cachers.Memory;

let ApiService = require("../../index");

// Create broker
let broker = new ServiceBroker({
	//cacher: new MemoryCacher(),
	logger: console,
	logLevel: {
		"*": "info",
		"API-GW-SVC": "debug"
	},
	statistics: true	
});

broker.loadService(path.join(__dirname, "..", "math.service"));

broker.createService(ApiService);

broker.start();