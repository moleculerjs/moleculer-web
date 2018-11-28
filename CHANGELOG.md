-----------------------------
<a name="0.8.5"></a>
# 0.8.5 (2018-11-28)

## Changes
- fix `req.url`, add `req.originalUrl` and `req.baseUrl` for better middleware support (e.g. support static serving in subpath).
- update deps

-----------------------------
<a name="0.8.3"></a>
# 0.8.3 (2018-11-11)

## Changes
- use `Promise` in `started` & `stopped` handlers.
- disable 4xx errors with `log4XXResponses` setting.

-----------------------------
<a name="0.8.2"></a>
# 0.8.2 (2018-10-04)

# New `authenticate` method.
This `authenticate` method is similar to `authorize`. You have access to `req`, `res` and `route` objects and you can authenticate the user from the request.
The returned data is saved to the `ctx.meta.user`. To enable this logic set `authentication: true` in route options.

**Example**
```js
module.exports = {
    name: "api",
    mixins: [ApiGatewayService],

    settings: {
        routes: [
            {
                // Enable authentication
                authentication: true
            }
        ]
    },

    methods: {
        authenticate(ctx, route, req, res) {
            let accessToken = req.query["access_token"];
            if (accessToken) {
                if (accessToken === "12345") {
                    return Promise.resolve({ id: 1, username: "john.doe", name: "John Doe" });
                } else {
                    return Promise.reject();
                }
            } else {
                return Promise.resolve(null);
            }
        }
    }
});
```

## Changes
- update dependencies.
- added `.npmignore`
-----------------------------

<a name="0.8.1"></a>
# 0.8.1 (2018-08-04)

## Changes
- fix missing dependency.
- fix middleware array promise-chaining bug
- handle terminated requests in middlewares
- update webpack-vue example to be up-to-date.

-----------------------------
<a name="0.8.0"></a>
# 0.8.0 (2018-07-08)

## Breaking changes

### The `onAfterCall` hook has changed
In previous versions of Moleculer Web, you couldn't manipulate the `data` in `onAfterCall`. Now you can, but you must always return the new or original `data`.

**Modify only headers**
```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            onAfterCall(ctx, route, req, res, data) {
                res.setHeader("X-Custom-Header", "123456");

                // Must return the original `data`
                return data;
            }
        }]
    }
});
```

**Modify (wrap) the original data**
```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            onAfterCall(ctx, route, req, res, data) {
                // Wrap the original data to a new object
                return {
                    other: "things",
                    data: data
                };
            }
        }]
    }
});
```

### Custom alias hooks
The `onBeforeCall` and `authorize` hooks are called before custom alias functions too.
And you have access to Context as `req.$ctx` or `res.$ctx`

### Whitelist string matcher changed
In early versions the `*` match string is enabled to call all services & actions. The matcher changed, in new versions use the `**` (double star) match string for the same function.

## New

### Response header data from `ctx.meta`
Since Moleculer v0.12, you can use `ctx.meta` to send back response headers to the Moleculer Web.
>The old method is deprecated but works.

**Available meta fields:**
* `ctx.meta.$statusCode` - set `res.statusCode`.
* `ctx.meta.$statusMessage` - set `res.statusMessage`.
* `ctx.meta.$responseType` - set `Content-Type` in header.
* `ctx.meta.$responseHeaders` - set all keys in header.
* `ctx.meta.$location` - set `Location` key in header for redirects.


**Old method**
```js
module.exports = {
    name: "export",
    actions: {
        downloadCSV: 
            responseType: "text/csv",
            responseHeaders: {
                "Content-Disposition": "attachment; filename=\"data.csv\"",
            },
            handler() {
                return "...";
            }
        }
    }
}
```

**New method**
```js
module.exports = {
    name: "export",
    actions: {
        // Download a file in the browser
        downloadCSV(ctx) {
            ctx.meta.$responseType = "text/csv";
            ctx.meta.$responseHeaders = {
                "Content-Disposition": `attachment; filename="data-${ctx.params.id}.csv"`
            };
            
            return "...";
        }

        // Redirect the request
        redirectSample(ctx) {
            ctx.meta.$statusCode = 302;
            ctx.meta.$location = "/test/hello";
        }
    }
}
```

### Support array & nested objects in query
Thanks for [@hwuethrich](https://github.com/hwuethrich), Moleculer Web supports arrays & nested objects in querystring.

**`GET /api/opt-test?a=1&a=2`**
```js
a: ["1", "2"]
```

**`GET /api/opt-test?foo[bar]=a&foo[bar]=b&foo[baz]=c`**
```js
foo: { 
    bar: ["a", "b"], 
    baz: "c" 
}
```

### Support error-handler middlewares
There is support to use error-handler middlewares in the API Gateway. So if you pass an `Error` to the `next(err)` function, it will call error handler middlewares which have signature as `(err, req, res, next)`.

```js
broker.createService({
    mixins: [ApiService],
    settings: {
        // Global middlewares. Applied to all routes.
        use: [
            cookieParser(),
            helmet()
        ],

        routes: [
            {
                path: "/",

                // Route-level middlewares.
                use: [
                    compression(),
                    
                    passport.initialize(),
                    passport.session(),

                    function(err, req, res, next) {
                        this.logger.error("Error is occured in middlewares!");
                        this.sendError(req, res, err);
                    }
                ],
```

## Changes
- `preValidate` has been removed.
- fix multiple CORS origin handling. Thanks for [@felipegcampos](https://github.com/felipegcampos)
- if `X-Correlation-Id` is in the request header, it is used as `requestID` in `Context`.
- types in errors have been changed (removed `ERR_` prefix)
- `path-to-regexp` is updated to v2.x.x

-----------------------------
<a name="0.6.4"></a>
# 0.6.4 (2018-03-04)

## Changes
- update dependencies.

-----------------------------
<a name="0.6.3"></a>
# 0.6.3 (2018-02-25)

## Changes
- fix Bluebird cancellation error `UnhandledPromiseRejectionWarning: Error: cannot enable cancellation after promises are in use`[#202](https://github.com/moleculerjs/moleculer/issues/202)
-update dependencies

-----------------------------
<a name="0.6.2"></a>
# 0.6.2 (2018-01-15)

## Changes
- turnable pre-validation with `preValidate` setting. Default to `true` in order to backward compatibility.
    ```js
    broker.createService({
        mixins: [ApiService],
        settings: {
            // Disable pre-validation at action calls
            preValidate: false
        }
    })
    ```

-----------------------------
<a name="0.6.1"></a>
# 0.6.1 (2018-01-07)

## Changes
- fix CORS `OPTIONS` handling. [#30](https://github.com/moleculerjs/moleculer-web/issues/30)

-----------------------------
<a name="0.6.0"></a>
# 0.6.0 (2018-01-04)

## Breaking changes

### Alias custom function arguments is changed
The `route` first argument is removed. The new signature of function is `function(req, res) {}`. To access to route use the `req.$route` property.
However you can use an array of `Function` for aliases. With it you can call middlewares. In this case the third argument is `next`. I.e.: `function(req, res, next) {}`.

## Other changes
- better error handling. Always returns with JSON error response.
- The charset is `UTF-8` for `application/json` responses.
- `logRequestParams` setting to log the request parameters. Use log level value i.e. `"debug"`, `"info"` or `null` to disable.
- `logResponseData` setting to log the response data. Use log level value i.e. `"debug"`, `"info"` or `null` to disable.
- `req.$service` & `res.$service` is pointed to the service instance.
- `req.$route` & `res.$route` is pointed to the route definition.
- `req.$params` is pointed to the resolved parameters (from query string & post body)
- `req.$alias` is pointed to the alias definition.
- `req.$endpoint` is pointed to the resolved action endpoint. It contains `action` and `nodeID`.

## Middlewares
Support middlewares in global, routes & aliases.

```js
broker.createService({
    mixins: [ApiService],
    settings: {
        // Global middlewares. Applied to all routes.
        use: [
            cookieParser(),
            helmet()
        ],

        routes: [
            {
                path: "/",

                // Route-level middlewares.
                use: [
                    compression(),
                    
                    passport.initialize(),
                    passport.session(),

                    serveStatic(path.join(__dirname, "public"))
                ],
                
                aliases: {
                    "GET /secret": [
                        // Alias-level middlewares.
                        auth.isAuthenticated(),
                        auth.hasRole("admin"),
                        "top.secret" // Call the `top.secret` action
                    ]
                }
            }
        ]
    }
});
```

## Custom response headers
It supports custom response headers to define in action definition.

```js
module.exports = {
    name: "export",
    actions: {
        downloadCSV: 
            responseHeaders: {
                "Content-Disposition": "attachment; filename=\"data.csv\"",
                "Content-Type": "text/csv"
            },
            handler() {
                return "...";
            }
        }
    }
}
```

## Error handlers
You can add route & global custom error handlers.

```js
broker.createService({
    mixins: [ApiService],
    settings: {

        routes: [{
            path: "/api",

            // Route error handler
            onError(req, res, err) {
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.writeHead(500);
                res.end(JSON.stringify(err));
            }
        }],

        // Global error handler
        onError(req, res, err) {
            res.setHeader("Content-Type", "text/plain");
            res.writeHead(501);
            res.end("Global error: " + err.message);
        }		
    }
}
```


## New examples to serve client-side developing with Webpack
- [Webpack](https://github.com/moleculerjs/moleculer-web/tree/master/examples/webpack) - webpack-dev-middleware example
- [Webpack & Vue](https://github.com/moleculerjs/moleculer-web/tree/master/examples/webpack-vue) - Webpack, VueJS, HMR example


-----------------------------
<a name="0.5.2"></a>
# 0.5.2 (2017-10-24)

## New
- add `mappingPolicy` route option

-----------------------------
<a name="0.5.1"></a>
# 0.5.1 (2017-10-07)

## New
- add CORS headers
- add Rate limiter

-----------------------------
<a name="0.5.0"></a>
# 0.5.0 (2017-09-12)

## Breaking changes
- compatibility with Moleculer >= v0.11.x

-----------------------------
<a name="0.4.4"></a>
# 0.4.4 (2017-08-20)

## Changes

- update Moleculer to v0.10

-----------------------------
<a name="0.4.1"></a>
# 0.4.1 (2017-07-24)

## New

### Prohibited action with `publish: false` action properties

```js
module.exports = {
    name: "test",
    actions: {
        dangerZone: {
            publish: false,
            handler(ctx) {
                return "You cannot call this action via API Gateway!";
            }
        }
    }
};
```

### Calling options in routes
The `route` has a `callOptions` property which is passed to `broker.call`. So you can set `timeout`, `retryCount` or `fallbackResponse` options for routes.

```js
broker.createService(ApiGatewayService, {
    settings: {
        routes: [{
            
            callOptions: {
                timeout: 1000, // 1 sec
                retryCount: 0,
                //fallbackResponse: { ... },
                // or 
                //fallbackResponse(ctx, err) { ... }
            }

        }]
    }
});
```

-----------------------------
<a name="0.4.0"></a>
# 0.4.0 (2017-07-07)

## Breaking changes
- in the REST shorthand, the `GET /` calls the `list` action instead of `find`. The reason is `list` action in `moleculer-db` is support pagination

## Changes
- changed order of param handling `ctx.params = Object.assign({}, body, query, params)`.
- moved `onBeforeCall` before `authorize` in request flow. So you can also reach unauthorized requests in `onBeforeCall` handler.
- the `sendResponse` method has new arguments: `sendResponse(ctx, route, req, res, data, responseType)`

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
For more information check the [full](/examples/full) or [authorization](/examples/authorization) examples or [readme](https://github.com/moleculerjs/moleculer-web#authorization)

-----------------------------
<a name="0.2.0"></a>
# 0.1.0 (2017-05-08)

First release.
