"use strict";

/**
 * This example uses API Gateway as a RESTful API server with caching.
 * 
 * Example:
 * 	
 *  - Get all posts  ( Please not if you call it again, it will come from cache! )
 * 		GET http://localhost:3000/posts
 *
 *  - Create a new post  ( it will clear the cache )
 * 		POST http://localhost:3000/posts
 *    Body
 * 		{
 * 			"title": "New post via REST",
 * 			"content": "Moleculer is awesome!",
 * 			"id": 11
 * 		}
 * 	
 *  - Get a post by ID  ( Please not if you call it again, it will come from cache! )
 * 		GET http://localhost:3000/posts/11
 * 
 *  - Update a post by ID  ( it will clear the cache )
 * 		PUT http://localhost:3000/posts/11
 * 		{
 * 			"title": "Modified post",
 * 			"content": "New content"
 * 		}
 * 	
 *  - Remove a post by ID  ( it will clear the cache )
 * 		DELETE http://localhost:3000/posts/11
 * 
 */

let path				= require("path");
let { ServiceBroker } 	= require("moleculer");
let MemoryCacher 		= require("moleculer").Cachers.Memory;
let ApiGatewayService 	= require("../../index");

// Create broker
let broker = new ServiceBroker({
	logger: console,
	cacher: new MemoryCacher(),
	metrics: true,
	validation: true
});

// Load other services
broker.loadService(path.join(__dirname, "..", "post.service"));

// Load API Gateway
broker.createService({
	mixins: ApiGatewayService,	
	settings: {
		routes: [{
			// RESTful aliases
			aliases: {
				"REST posts": "posts"
				/*
				"GET posts": "posts.find",
				"GET posts/:id": "posts.get",
				"POST posts": "posts.create",
				"PUT posts/:id": "posts.update",
				"DELETE posts/:id": "posts.remove"				
				*/
			}
		}]
	}
});

// Start server
broker.start();