[![Moleculer logo](http://moleculer.services/images/banner.png)](https://github.com/ice-services/moleculer)

[![Build Status](https://travis-ci.org/ice-services/moleculer-web.svg?branch=master)](https://travis-ci.org/ice-services/moleculer-web)
[![Coverage Status](https://coveralls.io/repos/github/ice-services/moleculer-web/badge.svg?branch=master)](https://coveralls.io/github/ice-services/moleculer-web?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/20ec4f97a71742a89646396bb48a8362)](https://www.codacy.com/app/mereg-norbert/moleculer-web?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ice-services/moleculer-web&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/ice-services/moleculer-web/badges/gpa.svg)](https://codeclimate.com/github/ice-services/moleculer-web)
[![David](https://img.shields.io/david/ice-services/moleculer-web.svg)](https://david-dm.org/ice-services/moleculer-web)
[![Known Vulnerabilities](https://snyk.io/test/github/ice-services/moleculer-web/badge.svg)](https://snyk.io/test/github/ice-services/moleculer-web)
[![Join the chat at https://gitter.im/ice-services/moleculer](https://badges.gitter.im/ice-services/moleculer.svg)](https://gitter.im/ice-services/moleculer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Official API Gateway for Moleculer framework  [![NPM version](https://img.shields.io/npm/v/moleculer-web.svg)](https://www.npmjs.com/package/moleculer-web)


The `moleculer-web` is the official API gateway service for [Moleculer](https://github.com/ice-services/moleculer). Use it to publish your services.

## Features
* support HTTP & HTTPS
* serve static files
* multiple routes
* alias names
* whitelist
* multiple body parsers (json, urlencoded)
* Buffer & Stream handling
* middleware mode (use as a middleware with Express)
* support authorization

## Install
```
npm install moleculer-web --save
```

## Usage

### Run with default settings
This example uses API Gateway service with default settings.
You can access to all services (including internal `$node.`) via `http://localhost:3000/`

```js
let { ServiceBroker } = require("moleculer");
let ApiService = require("moleculer-web");

let broker = new ServiceBroker();

// Load your services
broker.loadService(...);

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start();
```

**Example URLs:**	
- Call `test.hello` action: `http://localhost:3000/test/hello`
- Call `math.add` action with params: `http://localhost:3000/math/add?a=25&b=13`

- Get health info of node: `http://localhost:3000/~node/health`
- List all actions: `http://localhost:3000/~node/actions`

### Whitelist
If you don't want to public all actions, you can filter them with a whitelist.
You can use [match strings](https://github.com/micromatch/nanomatch) or regexp.

```js
broker.createService(ApiService, {
    settings: {
        routes: [{
            path: "/api",

            whitelist: [
                // Access to any actions in 'posts' service
                "posts.*",
                // Access to call only the `users.list` action
                "users.list",
                // Access to any actions in 'math' service
                /^math\.\w+$/
            ]
        }]
    }
});
```

### Aliases
You can use alias names instead of action names.

```js
broker.createService(ApiService, {
    settings: {
        routes: [{
            aliases: {
                // Call `auth.login` action with `GET /login` or `POST /login`
                "login": "auth.login"

                // Restrict the request method
                "POST users": "users.create",
            }
        }]
    }
});
```

With this you can create RESTful APIs.

```js
broker.createService(ApiService, {
    settings: {
        routes: [{
            aliases: {
                "GET users": "users.list",
                "POST users": "users.create",
                "PUT users": "users.update",
                "DELETE users": "users.remove",
            }
        }]
    }
});
```

### Serve static files
Serve assets files with the [serve-static](https://github.com/expressjs/serve-static) module like ExpressJS.

```js
broker.createService(ApiService, {
    settings: {
        assets: {
            // Root folder of assets
            folder: "./assets",

            // Further options to `server-static` module
            options: {}
        }		
    }
});
```

### Multiple routes 
You can create multiple routes with different prefix, whitelist, alias & authorization

```js
broker.createService(ApiService, {
    settings: {
        routes: [
            {
                path: "/admin",

                authorization: true,

                whitelist: [
                    "$node.*",
                    "users.*",
                ]
            },
            {
                path: "/",

                whitelist: [
                    "posts.*",
                    "math.*",
                ]
            }
        ]
    }
});
```

### Authorization
You can implement your authorization method to Moleculer Web. For this you have to do 2 things.
1. Set `authorization: true` in your routes
2. Define the `authorize` method.

> You can find a more detailed role-based JWT authorization example in [full example](/examples/full)

**Example authorization**
```js
broker.createService(ApiService, {
    settings: {
        routes: [{
            // First thing
            authorization: true,
        }]
    },

    methods: {
        /**
         * Second thing
         * 
         * Authorize the user from request
         * 
         * @param {Context} ctx 
         * @param {IncomingMessage} req 
         * @param {ServerResponse} res 
         * @returns {Promise}
         */
        authorize(ctx, req, res) {
            // Read the token from header
            let auth = req.headers["authorization"];
            if (auth && auth.startsWith("Bearer")) {
                let token = auth.slice(7);

                // Check the token
                if (token == "123456") {
                    // Set the authorized user entity to `ctx.meta`
                    ctx.meta.user = { id: 1, name: "John Doe" };
                    return Promise.resolve(ctx);

                } else {
                    // Invalid token
                    return Promise.reject(new CustomError("Unauthorized! Invalid token", 401));
                }

            } else {
                // No token
                return Promise.reject(new CustomError("Unauthorized! Missing token", 401));
            }
        }

    }
}
```


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


## Service settings
List of all settings of Moleculer Web servie

```js
settings: {

    // Exposed port
    port: 3000,

    // Exposed IP
    ip: "0.0.0.0",

    // HTTPS server with certificate
    https: {
        key: fs.readFileSync("ssl/key.pem"),
        cert: fs.readFileSync("ssl/cert.pem")
    },

    // Middleware mode (for ExpressJS)
    middleware: false,

    // Exposed path prefix
    path: "/api",

    // Routes
    routes: [
        {
            // Path prefix to this route  (full path: /api/admin )
            path: "/admin",

            // Whitelist of actions (array of string mask or regex)
            whitelist: [
                "users.get",
                "$node.*"
            ],

            // It will call the `this.authorize` method before call the action
            authorization: true,

            // Action aliases
            aliases: {
                "POST users": "users.create",
                "health": "$node.health"
            },

            // Use bodyparser module
            bodyParsers: {
                json: true,
                urlencoded: { extended: true }
            }
        },
        {
            // Path prefix to this route  (full path: /api )
            path: "",

            // Whitelist of actions (array of string mask or regex)
            whitelist: [
                "posts.*",
                "file.*",
                /^math\.\w+$/
            ],

            // No need authorization
            authorization: false,
            
            // Action aliases
            aliases: {
                "add": "math.add",
                "GET sub": "math.sub",
                "POST divide": "math.div",
            },
            
            // Use bodyparser module
            bodyParsers: {
                json: false,
                urlencoded: { extended: true }
            }
        }
    ],

    // Folder to server assets (static files)
    assets: {

        // Root folder of assets
        folder: "./examples/www/assets",
        
        // Options to `server-static` module
        options: {}
    }
}
```

## Examples
- [Simple](/examples/simple)
    - simple gateway with default settings.

- [SSL server](/examples/ssl)
    - open HTTPS server
    - whitelist handling

- [WWW with assets](/examples/www)
    - serve static files from the `assets` folder
    - whitelist
    - aliases
    - multiple body-parsers

- [Authorization](/examples/authorization)
    - simple authorization demo
    - set the authorized user to `Context.meta`

- [Express](/examples/express)
    - webserver with Express
    - use moleculer-web as a middleware

- [Full](/examples/full)
    - SSL
    - static files
    - multiple routes with different roles
    - role-based authorization with JWT
    - whitelist
    - aliases
    - multiple body-parsers
    - metrics, statistics & validation from Moleculer

## Test
```
$ npm test
```

In development with watching

```
$ npm run ci
```

## Contribution
Please send pull requests improving the usage and fixing bugs, improving documentation and providing better examples, or providing some testing, because these things are important.

## License
Moleculer-web is available under the [MIT license](https://tldrlegal.com/license/mit-license).

## Contact
Copyright (c) 2017 Ice-Services

[![@ice-services](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/ice-services) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
