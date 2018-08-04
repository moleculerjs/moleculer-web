const path = require("path");
const webpack = require("webpack");
const VueLoaderPlugin = require("vue-loader/lib/plugin");

module.exports = {
	mode: "development",
	devtool: "#eval-source-map",

	entry: {
		app: ["webpack-hot-middleware/client", path.join(__dirname, "client", "main.js")]
	},

	output: {
		path: path.join(__dirname, "public"),
		filename: "[name].js",
		publicPath: "/"
	},

	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: "vue-loader",
				options: {
					loaders: {
						"scss": [
							"vue-style-loader",
							"css-loader",
							"sass-loader"
						],
					}
				}
			},
			// this will apply to both plain `.js` files
			// AND `<script>` blocks in `.vue` files
			{
				test: /\.js$/,
				loader: "babel-loader",
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				use: [
					"vue-style-loader",
					"css-loader",
					"sass-loader"
				]
			},
			// this will apply to both plain `.css` files
			// AND `<style>` blocks in `.vue` files
			{
				test: /\.css$/,
				use: [
					"vue-style-loader",
					"css-loader"
				]
			}
		]

	},

	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoEmitOnErrorsPlugin(),
		new VueLoaderPlugin()
	],

	resolve: {
		extensions: [".vue", ".js", ".json"],
		mainFiles: ["index"],
		alias: {
			"vue$": "vue/dist/vue.esm.js"
		}
	},

	performance: {
		hints: false
	}
};
