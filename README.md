
[![Build Status](https://travis-ci.org/ice-services/moleculer-web.svg?branch=master)](https://travis-ci.org/ice-services/moleculer-web)
[![Coverage Status](https://coveralls.io/repos/github/ice-services/moleculer-web/badge.svg?branch=master)](https://coveralls.io/github/ice-services/moleculer-web?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/20ec4f97a71742a89646396bb48a8362)](https://www.codacy.com/app/mereg-norbert/moleculer-web?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ice-services/moleculer-web&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/ice-services/moleculer-web/badges/gpa.svg)](https://codeclimate.com/github/ice-services/moleculer-web)
[![David](https://img.shields.io/david/ice-services/moleculer-web.svg)](https://david-dm.org/ice-services/moleculer-web)
[![Known Vulnerabilities](https://snyk.io/test/github/ice-services/moleculer-web/badge.svg)](https://snyk.io/test/github/ice-services/moleculer-web)

# Official API Gateway for Moleculer framework
The `moleculer-web` is the official API gateway service for Moleculer. Use it to publish your services.

## Features
* support HTTP & HTTPS
* serve static files
* multiple routes
* alias names
* whitelist
* multiple body parsers (json, urlencoded)
* handle different response types
* Buffer & Stream handling

## Install
```
npm install moleculer-web --save
```

## Usage

### Run with default settings
This example uses API Gateway service with default settings.
You can access to math.* & internal $node.* actions via http://localhost:3000


```js
let { ServiceBroker } 	= require("moleculer");
let ApiService 			= require("moleculer-web");

// Create broker
let broker = new ServiceBroker();

// Load your services
broker.loadService(...);

// Load API Gateway
broker.createService(ApiService);

// Start server
broker.start();
```

**Example URLs:**	
- http://localhost:3000/test/hello
- http://localhost:3000/math/add?a=25&b=13

- Get health info http://localhost:3000/~node/health
- List of actions http://localhost:3000/~node/actions



# Test
```
$ npm test
```

or in development

```
$ npm run ci
```

# Contribution
Please send pull requests improving the usage and fixing bugs, improving documentation and providing better examples, or providing some testing, because these things are important.

# License
Moleculer-web is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2017 Ice-Services

[![@icebob](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/ice-services) [![@icebob](https://img.shields.io/badge/twitter-Icebobcsi-blue.svg)](https://twitter.com/Icebobcsi)