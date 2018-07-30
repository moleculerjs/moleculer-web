const fs = require("fs");
const path = require("path");
const { NotFoundError } = require("../src/errors");
const mkdir = require("mkdirp").sync;
const mime = require("mime-types");

const uploadDir = path.join(__dirname, "full", "uploads");
mkdir(uploadDir);

module.exports = {
	name: "file",
	actions: {
		image: {
			handler(ctx) {
				ctx.meta.$responseType = "image/png";
				// Return as stream
				return fs.createReadStream(path.join(__dirname, "full", "assets", "images", "logo.png"));
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
				const filePath = path.join(__dirname, "full", "uploads", ctx.params.file);
				if (!fs.existsSync(filePath))
					return new NotFoundError();

				ctx.meta.$responseType = mime.lookup(ctx.params.file);
				// Return as stream
				return fs.createReadStream(filePath);
			}
		},

		save: {
			handler(ctx) {
				return new this.Promise((resolve, reject) => {
					const filePath = path.join(__dirname, "full", "uploads", ctx.meta.filename);
					const f = fs.createWriteStream(filePath);
					f.on("close", () => {
						this.logger.info(`Uploaded file stored in '${filePath}'`);
						resolve(filePath);
					});
					f.on("error", err => reject(err));

					ctx.params.pipe(f);
				});
			}
		}
	}
};
