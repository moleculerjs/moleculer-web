<template>
	<div>
		<h1>{{ title }}</h1>
		<h2>{{ subTitle }}</h2>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				title: "Hello Webpack!!!",
				subTitle: "Hello Moleculer!"
			}
		}
	}
</script>

<style lang="scss" scoped>
	$headerColor: red;

	h1 {
		color: $headerColor;
	}

	h2 {
		color: green;
		font-style: italic;
	}
</style>
