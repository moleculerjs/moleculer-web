const fs = require("fs");
const path = require("path");
//const { MoleculerError } = require("moleculer").Errors;

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
		}
	}
};
