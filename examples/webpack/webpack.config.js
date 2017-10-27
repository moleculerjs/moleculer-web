const path = require("path");
const webpack = require("webpack");

module.exports = {
	devtool: "#inline-source-map",

	entry: {
		app: ["webpack-hot-middleware/client", path.join(__dirname, "client", "main.js")]
	},

	output: {
		path: path.join(__dirname, "public"),
		filename: "[name].js",
		publicPath: "/"
	},

	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoEmitOnErrorsPlugin()
	],

	module: {
		rules: [
			{
				test: /\.js?$/,
				loader: "babel-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.vue?$/,
				loader: "vue-loader",
			}
		]

	},

	resolve: {
		extensions: [".vue", ".js", ".json"],
		mainFiles: ["index"],
		alias: {
			"vue$": "vue/dist/vue.common.js"
		}
	},

	performance: {
		hints: false
	}
};
