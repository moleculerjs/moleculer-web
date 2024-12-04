"use strict";

const _ = require("lodash");
const { MoleculerError } = require("moleculer").Errors;
const fake = require("fakerator")();

function generateFakeData(count) {
	let rows = [];

	for (let i = 0; i < count; i++) {
		let item = fake.entity.post();
		item.id = i + 1;
		item.author = fake.random.number(1, 10);

		rows.push(item);
	}

	return rows;
}

module.exports = {
	name: "posts",
	//version: 2,

	settings: {
		//rest: "posts/"
	},

	actions: {
		list: {
			cache: true,
			rest: "GET /",
			handler(ctx) {
				// Clone the local list
				return this.rows;
			}
		},

		get: {
			cache: {
				keys: ["id"]
			},
			rest: "GET /:id",
			handler(ctx) {
				const post = this.findByID(ctx.params.id);
				if (post) return post;

				return Promise.reject(new MoleculerError("Post not found!", 404));
			}
		},

		feed: {
			rest: "GET /feed",
			handler(ctx) {
				return this.rows;
			}
		},

		create: {
			rest: "POST /",
			handler(ctx) {
				this.rows.push(ctx.params);

				this.clearCache();

				return this.rows[this.rows.length - 1];
			}
		},

		update: {
			rest: "PUT /:id",
			handler(ctx) {
				const post = this.findByID(ctx.params.id);
				if (post) {
					if (ctx.params.title) post.title = ctx.params.title;
					if (ctx.params.content) post.content = ctx.params.content;
					if (ctx.params.author) post.author = ctx.params.author;

					this.clearCache();
					return post;
				}
				return Promise.reject(new MoleculerError("Post not found!", 404));
			}
		},

		remove: {
			rest: "DELETE /:id",
			handler(ctx) {
				this.rows = this.rows.filter(row => row.id != ctx.params.id);
				this.clearCache();
			}
		}
	},

	methods: {
		findByID(id) {
			return this.rows.find(item => item.id == id);
		},

		clearCache() {
			this.broker.broadcast("cache.clean", this.name + ".*");
		}
	},

	created() {
		this.logger.debug("Generate fake posts...");
		this.rows = generateFakeData(5);
	}
};
