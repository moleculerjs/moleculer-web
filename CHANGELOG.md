<a name="0.10.3"></a>
# 0.10.3 (2021-10-17)

## Named authenticate & authorize methods [#275](https://github.com/moleculerjs/moleculer-web/issues/275)

You can define custom authentication and authorization methods for every routes. In this case you should set the method name instead of `true` value.

```js
module.exports = {
    mixins: ApiGatewayService,

    settings: {

        routes: [
            {
                path: "/aaa",
                authentication: "aaaAuthn",
                authorization: "aaaAuthz",
                aliases: {
                    "GET hello": "test.hello"
                }
            },
            {
                path: "/bbb",
                authentication: "bbbAuthn",
                authorization: "bbbAuthz",
                aliases: {
                    "GET hello": "test.hello"
                }
            },
            {
                path: "/ccc",
                authentication: true,
                authorization: true,
                aliases: {
                    "GET hello": "test.hello"
                }
            }
        ]
    },

    methods: {
        aaaAuthn() {
            // ... do authn
        },
        aaaAuthz() {
            // ... do authz
        },

        bbbAuthn() {
            // ... do authn
        },
        bbbAuthz() {
            // ... do authz
        },

        authenticate() {
            // ... do authn
        },
        authorize() {
            // ... do authz
        }
    }
}
```

## Configure rate limit options in routes level

```js
module.exports = {
    name: 'api',
    mixins: [ApiGateway],
    settings: {
        rateLimit: rateLimitGlobalConfig,
        routes: [
            {
                path: '/withLocalRateLimit',
                // now you can pass rateLimit here
                // it will override the global rateLimit
                rateLimit: rateLimitConfig,
                aliases: {
                    'GET /2': 'test.2'
                }
            },
            {
                path: '/withGlobalRateLimit',
                aliases: {
                    'GET /1': 'test.1'
                }
            }
        ]
    }
}
```

## Other changes
- update dependencies.
- add support for custom cors origin function. [#274](https://github.com/moleculerjs/moleculer-web/issues/274)
- typescript definition file is rewritten. [#259](https://github.com/moleculerjs/moleculer-web/issues/259)

-----------------------------
<a name="0.10.2"></a>
# 0.10.2 (2021-09-05)


## Named routes
Many developers issued that version 0.10 doesn't support multiple routes with the same path. This version fixes it but you should give a unique name for the routes if they have same path.

**Example**
You can call `/api/hi` without auth, but `/api/hello` only with auth.

```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        path: "/api",

        routes: [
            {
                name: "no-auth-route", // unique name
                path: "/",
                aliases: {
                    hi: "greeter.hello",
                }
            },
            {
                name: "with-auth-route", // unique name
                path: "/",
                aliases: {
                    "hello": "greeter.hello",
                },
                authorization: true
            }
        ]
    }
};
```

## Changes
- add `removeRouteByName(name: string)` method to remove a route by its name.


-----------------------------
<a name="0.10.1"></a>
# 0.10.1 (2021-09-01)

## Changes
- set the default JSON bodyparser if `bodyParser: true`. [#258](https://github.com/moleculerjs/moleculer-web/issues/258)
- add `pathToRegexpOptions` to route options to make available to pass options to `path-to-regexp` library. [#268](https://github.com/moleculerjs/moleculer-web/issues/268)
- add `debounceTime` to route options to make available to change the debounce time at service changes. [#260](https://github.com/moleculerjs/moleculer-web/issues/260)
- new `errorHandler` method to allow developers to change the default error handling behaviour. [#266](https://github.com/moleculerjs/moleculer-web/issues/266)
- fixes CORS preflight request handling in case of full-path aliases. [#269](https://github.com/moleculerjs/moleculer-web/issues/269)
- update dependencies

-----------------------------
<a name="0.10.0"></a>
# 0.10.0 (2021-06-27)

## Breaking changes

### Avoid array wrapping at file uploading
Many users issued that at file uploading the response always wrapped into an array even single file uploading. This issues is fixed in this version. 
If you define `files: 1` in busboy settings, the response won't be wrapped into array.

**Example**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        path: "/upload",

        routes: [
            {
                path: "/upload",

                busboyConfig: {
                    limits: {
                        files: 1
                    }
                },
            }
        ]
    }
};
```

### JSON body-parser is the new default.
In early version, if you added multiple routes, you should always set JSON body-parser. As of v0.10, it's the new default, if you don't define `bodyParsers` in the route options. If you don't want to use any body-parsers just set `bodyParsers: false`.

**Example: disable body parsers**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        routes: [
            {
                path: "/api",
                bodyParsers: false
            }
        ]
    }
};
```
## New features

### Actions for adding and removing routes
The `addRoute` and `removeRoute` methods exposed to service actions, as well. It means, you can add/remove routes from remote nodes, as well.

**Adding a new route**
```js
broker.call("api.addRoute", {
    route: {
        path: "/api",
        aliases: {
            "hi": "greeter.hello"
        }
    },
    toBottom: true // add this route to the end of the route list.
})
```

**Removing a route**
```js
broker.call("api.removeRoute", { path: "/api" });
```

### New logging options
There are two new logging service settings: `logRequest`, `logResponse`. You can define the logging level for request & response log messages.

```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        logRequest: "debug", // Logging with debug level
        logResponse: false, // Disable logging
        //.....
    }
};
```

### New `rootCallOptions` options
There a new `rootCallOptions` property in the service settings. Here you can define the root `Context` calling options. It can be a static `Object` or a `Function`. It can be useful to take some data from the `req` and put them to the calling options (like tracing informations)

**Example with static object**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        routes: [/*...*/],

        rootCallOptions: {
            timeout: 500
        }
    }
};
```

**Example with Function which takes tracing information from the req and put them to the calling options**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        routes: [/*...*/],

        rootCallOptions(options, req, res) {
            if (req.headers["traceparent"]) {
                // More info https://www.w3.org/TR/trace-context/#traceparent-header
                const traceparent = req.headers["traceparent"].toLowerCase();
                if (traceparent.match(/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/)) {
                    const [version, id, parentSpan, flags] = traceparent.split("-");
                    const sampled = (flags & FLAG_SAMPLED) == FLAG_SAMPLED;

                    options.parentSpan = {
                        id: parentSpan,
                        traceID: id,
                        sampled
                    };
                }
            } else {
                // Look for X-B3-Traceid, X-B3-Spanid
                options.parentSpan = {};

                if (req.headers["x-b3-traceid"]) {
                    options.parentSpan.traceID = req.headers["x-b3-traceid"].toLowerCase();
                    options.parentSpan.sampled = true;
                }
                if (req.headers["x-b3-spanid"]) {
                    options.parentSpan.id = req.headers["x-b3-spanid"].toLowerCase();
                }
            }
        }
    }
};
```

## Multiple route aliases
You can define multiple REST aliases in the action definitions.

```js
module.exports = {
    name: "posts",

    settings: {
        rest: ["/posts", "/v1/posts"]
    },

    actions: {
        find: {
            rest: ["GET /", "GET /all"]
            handler(ctx) {}
        }
    }
};
```

## Multipart fields & URL Params
Several issues has been fixed with multipart handling.
- URL parameters (e.g. `/api/upload/:tenant/:folder`) is available via `ctx.meta.$params`
- Multipart fields is available via `ctx.meta.$multipart`
- `ctx.params.$params` is not available, use `ctx.meta.$params`
- The target action is called if no uploaded files but has multipart fields. In this case `ctx.params` is `{}` and the fields are in `ctx.meta.$multipart`.

## Other changes
- set response header from `ctx.meta` in case of errors, as well.
- update dependencies.
- update index.d.ts.
- remove deprecated `publish: false` condition. Use `visibility: "public", instead.

-----------------------------
<a name="0.9.1"></a>
# 0.9.1 (2020-02-29)

## Changes
- remove empty log lines
- add `encodeResponse(req, res, data)` method. You can overwrite it in order to use other response encoding instead of JSON.

-----------------------------
<a name="0.9.0"></a>
# 0.9.0 (2020-02-12)

## Breaking changes

### Drop Node 6 & 8 support
Due to Node 6 & 8 LTS end of life, the minimum Node version is 10.

### Changed `mappingPolicy` default value
In the previous version the `mappingPolicy` default value was `all` which means, you can call
any services via API Gateway which accepted by whitelist. This setting is not too secure.
From this version, the default value is `restrict` if at least one alias is defined in route options.
If there are not aliases & `mappingPolicy` defined, the behaviour will be the old one.

### Use `server` property instead of `middleware`
We have removed the `middleware` service setting because it was not straightforward. Therefore, we have created a new `server` setting.
If `server: true` (which is the default value), API Gateway will create a HTTP(s) server. If `server: false`, it won't create a HTTP server, so you can use API Gateway as an Express middleware.

#### Migration guide

**Before**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        middleware: true
    }
}
```

**After**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        server: false
    }
}
```

### Other low-level breaking changes
- `sendResponse` signature is changed to `this.sendResponse(req, res, data)`

## New 

### File upload aliases
API Gateway has implemented file uploads. You can upload files as a multipart form data (thanks for busboy library) or as a raw request body. In both cases, the file is transferred to an action as a Stream. In multipart form data mode you can upload multiple files, as well.

> Please note, you have to disable other body parsers in order to accept files.

**Example**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        path: "/upload",

        routes: [
            {
                path: "",

                // You should disable body parsers
                bodyParsers: {
                    json: false,
                    urlencoded: false
                },

                aliases: {
                    // File upload from HTML multipart form
                    "POST /": "multipart:file.save",
                    
                    // File upload from AJAX or cURL
                    "PUT /": "stream:file.save",

                    // File upload from HTML form and overwrite busboy config
                    "POST /multi": {
                        type: "multipart",
                        // Action level busboy config
                        busboyConfig: {
                            limits: {
                                files: 3
                            }
                        },
                        action: "file.save"
                    }
                },

                // Route level busboy config.
                // More info: https://github.com/mscdex/busboy#busboy-methods
                busboyConfig: {
                    limits: {
                        files: 1
                    }
                    // Can be defined limit event handlers
                    // `onPartsLimit`, `onFilesLimit` or `onFieldsLimit`
                },

                mappingPolicy: "restrict"
            }
        ]
    }
});
```

### HTTP2 server
HTTP2 experimental server has been implemented into API Gateway. You can turn it on with `http2: true` service setting.

**Example**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        port: 8443,

        // HTTPS server with certificate
        https: {
            key: fs.readFileSync("key.pem"),
            cert: fs.readFileSync("cert.pem")
        },

        // Use HTTP2 server
        http2: true
    }
});
```

### Dynamic routing
The `this.addRoute(opts, toBottom = true)` new service method is added to add/replace routes. You can call it from your mixins to define new routes _(e.g. swagger route, graphql route...etc)_.
The function detects that the route is defined early. In this case, it will replace the previous route configuration with the new one.

To remove a route, use the `this.removeRoute("/admin")` method. It removes the route by path.

### ETag supporting
Thank to tiaod for ETag implementation. PR: [#92](https://github.com/moleculerjs/moleculer-web/pull/92)

**Example**
```js
const ApiGateway = require("moleculer-web");

module.exports = {
    mixins: [ApiGateway],
    settings: {
        // Service-level option
        etag: false,

        routes: [
            {
                path: "/",

                // Route-level option.
                etag: true
            }
        ]
    }
}
```

The `etag` option value can be `false`, `true`, `weak`, `strong`, or a custom Function.

**Custom ETag generator function**
```js
module.exports = {
    mixins: [ApiGateway],
    settings: {
        // Service-level option
        etag: (body) => generateHash(body)
    }
}
```

Please note, it doesn't work with stream responses. In this case, you should generate the etag by yourself.

**Example**
```js
module.exports = {
    name: "export",
    actions: {
        // Download response as a file in the browser
        downloadCSV(ctx) {
            ctx.meta.$responseType = "text/csv";
            ctx.meta.$responseHeaders = {
                "Content-Disposition": `attachment; filename="data-${ctx.params.id}.csv"`,
                "ETag": '<your etag here>'
            };
            return csvFileStream;
        }
    }
}
```

### Auto-aliasing feature
The auto-aliasing means you don't have to add all service aliases to the routes, the Gateway can generate it from service schema. If a new service is entered or leaved, Gateway regenerate aliases.

To configure which services are used in route use the whitelist.

**Example**
```js
// api.service.js
module.exports = {
    mixins: [ApiGateway],

    settings: {
        routes: [
            {
                path: "/api",

                whitelist: [
                    "posts.*",
                    "test.*"
                ],

                aliases: {
                    "GET /hi": "test.hello"
                },

                autoAliases: true
            }
        ]
    }
};
```

```js
// posts.service.js
module.exports = {
    name: "posts",
    version: 2,

    settings: {
        // Base path
        rest: "posts/"
    },

    actions: {
        list: {
            // Expose as "/api/v2/posts/"
            rest: "GET /",
            handler(ctx) {}
        },

        get: {
            // Expose as "/api/v2/posts/:id"
            rest: "GET /:id",
            handler(ctx) {}
        },

        create: {
            rest: "POST /",
            handler(ctx) {}
        },

        update: {
            rest: "PUT /:id",
            handler(ctx) {}
        },

        remove: {
            rest: "DELETE /:id",
            handler(ctx) {}
        }
    }
};
```

**The generated aliases**
```
   GET /api/hi             => test.hello
   GET /api/v2/posts       => v2.posts.list
   GET /api/v2/posts/:id   => v2.posts.get
  POST /api/v2/posts       => v2.posts.create
   PUT /api/v2/posts/:id   => v2.posts.update
DELETE /api/v2/posts/:id   => v2.posts.remove
```

**Example to define full path alias**
```js
// posts.service.js
module.exports = {
    name: "posts",
    version: 2,

    settings: {
        // Base path
        rest: "posts/"
    },

    actions: {
        tags: {
            // Expose as "/tags/" instead of "/api/v2/posts/tags"
            rest: {
                method: "GET",
                fullPath: "/tags"
            },
            handler(ctx) {}
        }
    }
};
```

## Changes
- new `optimizeOrder: true` setting in order to optimize route & alias paths (deeper first). Default: `true`.
- new `logging` route option to disable request logging. It can be useful for health check routes. Default: `true`.
- tilde (`~`) replace issue fixed. [#98](https://github.com/moleculerjs/moleculer-web/pull/98)
- throw `503` - `ServiceUnavailableError` when a service defined in aliases but not available. Ref: [#27](https://github.com/moleculerjs/moleculer-web/issues/27)
- new `internalServiceSpecialChar` service setting to override special char for internal services (`~`)
- new `httpServerTimeout` setting to overwrite the default HTTP server timeout. [#126](https://github.com/moleculerjs/moleculer-web/pull/126)
- add `reformatError` method to change the response error object (remove or add fields, localize error message...etc).
- new `listAliases` action to get all registered route aliases.
- remove bluebird dependency & using native Promise & async/await.

-----------------------------
<a name="0.8.5"></a>
# 0.8.5 (2018-11-28)

## Changes
- allow multiple whitespaces between method & path in aliases.

-----------------------------
<a name="0.8.4"></a>
# 0.8.4 (2018-11-18)

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
