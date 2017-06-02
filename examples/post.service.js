"use strict";

const _ 		= require("lodash");
const { MoleculerError } = require("moleculer").Errors;
const fake 		= require("fakerator")();

function generateFakeData(count) {
	let rows = [];

	for(let i = 0; i < count; i++) {
		let item = fake.entity.post();
		item.id = i + 1;
		item.author = fake.random.number(1, 10);

		rows.push(item);
	}

	return rows;
}

module.exports = {
	name: "posts",

	actions: {
		find: {
			cache: true,
			handler(ctx) {
				
				// Clone the local list
				let posts = _.cloneDeep(this.rows);

				/*// Resolve authors
				let authorPromises = posts.map(post => {
					return ctx.call("users.get", { id: post.author}).then(user => post.author = _.pick(user, ["id", "userName", "email", "name", "avatar"]));
				});

				return Promise.all(authorPromises).then(() => {
					return posts;
				});
				*/
				return posts;
			}
		},


		get: {
			cache: {
				keys: ["id"]
			},
			handler(ctx) {
				return this.findByID(ctx.params.id);
			}
		},

		create: {
			handler(ctx) {
				this.rows.push(ctx.params);

				this.clearCache();

				return ctx.params;
			}
		},

		update: {
			handler(ctx) {
				const post = this.findByID(ctx.params.id);
				if (post) {
					if (ctx.params.title)
						post.title = ctx.params.title;
					if (ctx.params.content)
						post.content = ctx.params.content;
					if (ctx.params.author)
						post.author = ctx.params.author;

					this.clearCache();
					return post;
				}
				return Promise.reject(new MoleculerError("Post not found!", 404));
			}
		},

		remove: {
			handler(ctx) {
				this.rows = this.rows.filter(row => row.id != ctx.params.id);
				this.clearCache();
			}
		}

	},

	methods: {
		findByID(id) {
			return _.cloneDeep(this.rows.find(item => item.id == id));
		},

		clearCache() {
			this.broker.emitLocal("cache.clean", this.name + ".*");
		}
	},

	created() {
		this.logger.debug("Generate fake posts...");
		this.rows = generateFakeData(5);
	}
};