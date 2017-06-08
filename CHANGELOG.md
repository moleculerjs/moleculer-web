<a name="0.3.4"></a>
# 0.3.4 (2017-06-xx)

## Changes
- changed order of param handling `ctx.params = Object.assign({}, body, query, params)`.
- moved `onBeforeCall` before `authorize` in request flow. So you can also reach unauthorized requests in `onBeforeCall` handler.


-----------------------------
<a name="0.3.3"></a>
# 0.3.3 (2017-06-07)

## New

### Functions in aliases
There is available to use custom function in aliases. In this case you got `req` & `res` and you should return with the response. Use it for example file uploads. You can find example in the [full example](examples/full/index.js).

**Usage**
```js
    ...
        aliases: {
            "add/:a/:b": "math.add",
            "GET sub": "math.sub",
            "POST upload"(route, req, res) {
                //Do something and call res.end()
            }
        }
    ...
```

### New `camelCaseNames` route setting
There is a new `camelCaseNames` option in route setting. If it is true, the service will convert the received action name to [camelCase](https://lodash.com/docs/4.17.4#camelCase) name.

**Usage**
```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            camelCaseNames: true
        }]
    }
});

broker.createService({
    name: "test",
    actions: {
        sayHi(ctx) {
            return "Hi!"
        }
    }
});

// Start server
broker.start();
```
In the above example the `sayHi` action can be called with http://localhost:3000/test/say-hi as well.

-----------------------------
<a name="0.3.2"></a>
# 0.3.2 (2017-06-02)

## New

### Exposed error classes

**Available errors:**

| Class | Params | Description |
| ----- | ------ | ----------- |
|`UnAuthorizedError`|`type`, `data`| Unauthorized HTTP error (401) |
|`ForbiddenError`|`type`, `data`| Forbidden HTTP error (403) |
|`BadRequestError`|`type`, `data`| Bad Request HTTP error (400) |

**Type contants:**
- `ERR_NO_TOKEN`
- `ERR_INVALID_TOKEN`
- `ERR_UNABLE_DECODE_PARAM`

**Usage**
```js
const { UnAuthorizedError, ERR_NO_TOKEN } = require("moleculer-web").Errors;
    ...
    actions: {
        update(ctx) {
            if(!ctx.meta.user)
                return Promise.reject(new UnAuthorizedError(ERR_NO_TOKEN));
        }
    }
    ...
```

-----------------------------
<a name="0.3.1"></a>
# 0.3.1 (2017-06-02)

## New

### RESTful routes
It is possible to use RESTful aliases which routed to CRUD service actions.

**Usage**
```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            // RESTful aliases
            aliases: {
                "REST posts": "posts"
            }
        }]
    }
});

// Start server
broker.start();
```

The `"REST posts": "posts"` will be extracted to these aliases:
```js
"GET posts":        "posts.find",
"GET posts/:id":    "posts.get",
"POST posts":       "posts.create",
"PUT posts/:id":    "posts.update",
"DELETE posts/:id": "posts.remove"				
```

Example: [examples/rest](/examples/rest)

-----------------------------
<a name="0.3.0"></a>
# 0.3.0 (2017-06-01)

## New

### Named parameters in aliases
It is possible to use named parameters in aliases. Named paramters are defined by prefixing a colon to the parameter name (`:name`)

**Usage**
```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            path: "/api",

            aliases: {
                "GET greeter/:name": "test.greeter",
                "optinal-param/:name?": "test.echo",
                "repeat-param/:args*": "test.echo",
                "GET /": "test.hello"                
            }
        }]
    }
});

// Start server
broker.start();
```

Example: [examples/full](/examples/full)

-----------------------------
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
