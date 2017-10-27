const path = require("path");
const webpack = require("webpack");

module.exports = {
	devtool: "#inline-source-map",

	entry: {
		app: path.join(__dirname, "client", "main.js")
	},

	output: {
		path: path.join(__dirname, "public"),
		filename: "[name].js",
		publicPath: "/"
	}
};
