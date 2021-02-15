const path = require("path");

module.exports = {
	mode: "development",
	devtool: "cheap-source-map",

	entry: {
		app: path.join(__dirname, "client", "main.js")
	},

	output: {
		path: path.join(__dirname, "public"),
		filename: "[name].js",
		publicPath: "/"
	}
};
