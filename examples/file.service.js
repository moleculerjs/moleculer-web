const fs = require("fs");
const path = require("path");
const { NotFoundError } = require("../src/errors");
const { mkdirpSync } = require("mkdirp");
const mime = require("mime-types");

const uploadDir = path.join(__dirname, "__uploads");
mkdirpSync(uploadDir);

module.exports = {
	name: "file",
	actions: {
		image: {
			handler(ctx) {
				ctx.meta.$responseType = "image/png";
				// Return as stream
				return fs.createReadStream(
					path.join(__dirname, "full", "assets", "images", "logo.png")
				);
			}
		},

		html: {
			handler(ctx) {
				ctx.meta.$responseType = "text/html";
				return Buffer.from(`
<html>
<body>
	<h1>Hello API Gateway!</h1>
	<img src="/api/file.image" />
</body>
</html>
				`);
			}
		},

		get: {
			handler(ctx) {
				const filePath = path.join(uploadDir, ctx.params.file);
				if (!fs.existsSync(filePath)) return new NotFoundError();

				ctx.meta.$responseType = mime.lookup(ctx.params.file);
				// Return as stream
				return fs.createReadStream(filePath);
			}
		},

		save: {
			handler(ctx) {
				this.logger.info("Received upload params:", ctx.params);
				return new this.Promise((resolve, reject) => {
					//reject(new Error("Disk out of space"));
					const filePath = path.join(
						uploadDir,
						ctx.params.$filename || this.randomName()
					);
					const f = fs.createWriteStream(filePath);
					f.on("close", () => {
						// File written successfully
						this.logger.info(`Uploaded file stored in '${filePath}'`);
						resolve({ filePath, params: ctx.params });
					});

					ctx.stream.on("error", err => {
						this.logger.info("File error received", err.message);
						reject(err);

						// Destroy the local file
						f.destroy(err);
					});

					f.on("error", () => {
						// Remove the errored file.
						fs.unlinkSync(filePath);
					});

					ctx.stream.pipe(f);
				});
			}
		}
	},
	methods: {
		randomName() {
			return "unnamed_" + Date.now() + ".png";
		}
	}
};
