[![Moleculer logo](http://moleculer.services/images/banner.png)](https://github.com/moleculerjs/moleculer)

[![Build Status](https://travis-ci.org/moleculerjs/moleculer-web.svg?branch=master)](https://travis-ci.org/moleculerjs/moleculer-web)
[![Coverage Status](https://coveralls.io/repos/github/moleculerjs/moleculer-web/badge.svg?branch=master)](https://coveralls.io/github/moleculerjs/moleculer-web?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/5d0c3b3d03bd4e8683a19630a32ad22b)](https://www.codacy.com/app/mereg-norbert/moleculer-web?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=moleculerjs/moleculer-web&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/6d81a3b83b448bbb1f99/maintainability)](https://codeclimate.com/github/moleculerjs/moleculer-web/maintainability)
[![David](https://img.shields.io/david/moleculerjs/moleculer-web.svg)](https://david-dm.org/moleculerjs/moleculer-web)
[![Known Vulnerabilities](https://snyk.io/test/github/moleculerjs/moleculer-web/badge.svg)](https://snyk.io/test/github/moleculerjs/moleculer-web)
[![Join the chat at https://gitter.im/moleculerjs/moleculer](https://badges.gitter.im/moleculerjs/moleculer.svg)](https://gitter.im/moleculerjs/moleculer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Official API Gateway for Moleculer framework  [![NPM version](https://img.shields.io/npm/v/moleculer-web.svg)](https://www.npmjs.com/package/moleculer-web)


The `moleculer-web` is the official API gateway service for [Moleculer](https://github.com/moleculerjs/moleculer). Use it to publish your services.

## Features
* support HTTP & HTTPS
* serve static files
* multiple routes
* support global, route, alias middlewares
* alias names (with named parameters & REST shorthand)
* whitelist
* multiple body parsers (json, urlencoded)
* CORS headers
* Rate limiter
* before & after call hooks
* Buffer & Stream handling
* middleware mode (use as a middleware in ExpressJS Application)
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

let broker = new ServiceBroker({ logger: console });

// Create a service
broker.createService({
    name: "test",
    actions: {
        hello() {
            return "Hello API Gateway!"
        }
    }
});

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start();
```

**Test URLs:**	
- Call `test.hello` action: `http://localhost:3000/test/hello`

- Get health info of node: `http://localhost:3000/~node/health`
- List all actions: `http://localhost:3000/~node/actions`

## Documentation
Please read our [documentation on Moleculer site](http://moleculer.services/docs/moleculer-web.html)

## Test
```
$ npm test
```

In development with watching

```
$ npm run ci
```

## License
Moleculer-web is available under the [MIT license](https://tldrlegal.com/license/mit-license).

## Contact
Copyright (c) 2016-2017 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
