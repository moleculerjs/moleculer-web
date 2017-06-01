<a name="0.2.2"></a>
# 0.2.2 (2017-06-01)

## New

### Before & after call hooks
The route of service has `onBeforeCall` and `onAfterCall` hooks. It can be asynchronous if return with Promise. In methods the `this` is pointed to Service instance. So you can access the service methods & broker.

**Usage**
```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            // Call before `broker.call`
            onBeforeCall(ctx, route, req, res) {
                // Save request headers to context meta
                ctx.meta.userAgent = req.headers["user-agent"];
            },

            // Call after `broker.call` and before send back the response
            onAfterCall(ctx, route, req, res, data) {
                res.setHeader("X-Custom-Header", "123456");
            }
        }]
    }
});

// Start server
broker.start();
```

Example: [examples/full](/examples/full)

-----------------------------
<a name="0.2.1"></a>
# 0.2.1 (2017-05-23)

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
