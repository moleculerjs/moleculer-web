var div = document.querySelector("#counter");

var counter = 1;
setInterval(function() {
	div.textContent = "Counter " + counter++;
}, 1000);
