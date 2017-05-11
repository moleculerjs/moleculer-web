<a name="0.3.0"></a>
# 0.3.0 (2017-xx-xx)

## New

### ExpressJS middleware usage
You can use Moleculer-Web as a middleware for [ExpressJS](http://expressjs.com/).

**Usage**
```js
const svc = broker.createService(ApiGatewayService, {
	settings: {
		middleware: true
	}
});

// Create Express application
const app = express();

// Use ApiGateway as middleware
app.use("/api", svc.express());

// Listening
app.listen(3000);

// Start server
broker.start();
```

Example: [examples/express](/examples/express)

-----------------------------
<a name="0.2.0"></a>
# 0.2.0 (2017-05-09)

## New

### Support custom authorization
For more information check the [full](/examples/full) or [authorization](/examples/authorization) examples or [readme](https://github.com/ice-services/moleculer-web#authorization)

-----------------------------
<a name="0.2.0"></a>
# 0.1.0 (2017-05-08)

First release.
