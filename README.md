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
* before & after call hooks
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
Copyright (c) 2016-2017 Ice-Services

[![@ice-services](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/ice-services) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
