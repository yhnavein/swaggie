<div style="text-align: center; margin: 0px auto 30px; max-width: 600px">
  <img src="./swaggie.svg" alt="Swaggie logo">
</div>

# Swaggie

![npm latest version](https://img.shields.io/npm/v/swaggie)
![NodeCI](https://github.com/yhnavein/swaggie/workflows/NodeCI/badge.svg)
[![CircleCI](https://circleci.com/gh/yhnavein/swaggie.svg?style=svg)](https://circleci.com/gh/yhnavein/swaggie)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/yhnavein/swaggie.svg)
![npm downloads](https://img.shields.io/npm/dw/swaggie.svg)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/swaggie.svg)
![npm install size](https://packagephobia.now.sh/badge?p=swaggie)

<!-- ![Dependencies](https://img.shields.io/david/yhnavein/swaggie.svg) -->

Generate ES6 or Typescript code from an OpenAPI 2.0 spec, so that accessing REST API resources from the client code is less error-prone, static-typed and just easier to use long-term.

You can take a look at the [Examples section](#example) down below.

Project is based and inspired by [OpenApi Client](https://github.com/mikestead/openapi-client).

## Install

In your project

    npm install swaggie --save-dev

Or globally to run CLI from anywhere

    npm install swaggie -g

### CLI

```
Usage: swaggie [options]

Options:

  -h, --help               output usage information
  -V, --version            output the version number
  -c, --config <path>      The path to the configuration JSON file. You can do all the set up there instead of parameters in the CLI
  -s, --src <url|path>     The url or path to the Open API spec file
  -t, --template <string>  Template used forgenerating API client. Default: "axios"
  -o, --out <path>         The path to the file where the API would be generated
  -b, --baseUrl <string>   Base URL that will be used as a default value in the clients. Default: ""
  --preferAny              Use "any" type instead of "unknown". Default: false
  --servicePrefix <string>  Prefix for service names. Useful when you have multiple APIs and you want to avoid name collisions. Default: ''
  --queryModels <bool>     Generate models for query string instead list of parameters. Default: false
```

Sample CLI usage using Swagger's Pet Store:

```bash
swaggie -s https://petstore.swagger.io/v2/swagger.json -o ./client/petstore/
```

`swaggie` outputs TypeScript that is somehow formatted, but it's far from perfect. You can adjust the generated code by prettifying output using your preferred beautify tool using your repo's styling guidelines. For example involving `prettier` looks like this:

```bash
swaggie -s $URL -o ./client/petstore.ts && prettier ./client/petstore.ts --write`
```

And this can be easily automated (in the npm scripts for example)

### Configuration File

Instead of providing all required flags from the command line you can alternatively create a new JSON file where you can fill up all settings.

Sample configuration looks like this:

```json
{
  "$schema": "https://raw.githubusercontent.com/yhnavein/swaggie/master/schema.json",
  "out": "./src/client/petstore.ts",
  "src": "https://petstore.swagger.io/v2/swagger.json",
  "template": "axios",
  "baseUrl": "/api",
  "preferAny": true,
  "servicePrefix": "",
  "queryModels": true,
  "dateFormat": "Date" // "string" | "Date"
}
```

### Templates

The following templates are bundled with Swaggie:

```
axios     Default template. Recommended for React / Vue / similar frameworks. Uses axios
swr-axios Template that embraces SRW for GET requests and as a fallback uses axios.
fetch     Template similar to axios, but with fetch API instead. Recommended for React / Vue / similar frameworks
ng1       Template for Angular 1 (this is for the old one)
ng2       Template for Angular 2+ (uses HttpClient, InjectionTokens, etc)
```

If you want to use your own template, you can use the path to your template for the `-t` parameter:

```
swaggie -s https://petstore.swagger.io/v2/swagger.json -o ./client/petstore --template ./my-swaggie-template/
```

### Code

```javascript
const swaggie = require('swaggie');
swaggie
  .genCode({
    src: 'http://petstore.swagger.io/v2/swagger.json',
    out: './api/petstore.ts',
  })
  .then(complete, error);

function complete(spec) {
  console.info('Service generation complete');
}

function error(e) {
  console.error(e.toString());
}
```

## Usage – Integrating into your project

Let's assume that you have a [PetStore API](http://petstore.swagger.io/) as your REST API and you are developing a client app written in TypeScript that will consume this API.

Instead of writing any code by hand for fetching particular resources, we will let Swaggie do it for us.

> Please note that it's **recommended** to pipe Swaggie command to some prettifier like `prettier` or `dprint` to make the generated code look not only nice, but also persistent.
> Because Swaggie relies on a templating engine, whitespaces are generally a mess, so they may change between versions.

### Suggested prettiers

[prettier](https://prettier.io/) - the most popular one

```sh
prettier ./FILE_PATH.ts --write
```

[dprint](https://dprint.dev/cli/) - the superfast one

```sh
dprint fmt ./FILE_PATH.ts
```

You are not limited to any of these, but in our examples we will use Prettier. Please remember that these tools needs to be installed first and they need a config file in your project.

### Example

Let's run `swaggie` against PetStore API and see what will happen:

```bash
swaggie -s https://petstore.swagger.io/v2/swagger.json -o ./api/petstore.ts && prettier ./api/petstore.ts --write
```

```typescript
// ./api/petstore.ts

import Axios, { AxiosPromise } from 'axios';
const axios = Axios.create({
  baseURL: '/api',
});

/** [...] **/

export const petClient = {
  /**
   * @param petId
   * @return Success
   */
  getPetById(petId: number): AxiosPromise<Pet> {
    let url = '/pet/{petId}';

    url = url.replace('{petId}', encodeURIComponent('' + petId));

    return axios.request<Pet>({
      url: url,
      method: 'GET',
    });
  },

  // ... and other methods ...
};
```

When we have that we can write some domain code and use this auto-generated classes:

```typescript
// app.ts

import { petClient } from './api/petClient';

petClient.getPetById(123).then((pet) => console.log('Pet: ', pet));
```

If Petstore owners decide to remove method we use, then after running `swaggie` again it will no longer be present in the `petClient` class. This will result in the build error, which is very much appreciated at this stage.

Without this approach, the error would be spotted by our end-user and he/she would not appreciate it at all!

## Server config

You might wonder how to set up server to fully utilize Swaggie's features. For that I've added a `samples/` folder with sample configurations.

[ASP.NET Core + Nswag](./samples/dotnetcore/nswag/README.md)

[ASP.NET Core + Swashbuckle](./samples/dotnetcore/swashbuckle/README.md)

Server is not necessary to use Swaggie. Swaggie cares only about the JSON/yaml file with the Open API spec, but for your development purpose you might want to have a server that can serve this file automatically from the actual endpoints.

## Notes

If you are familiar with the client-code generators for the Swagger / OpenAPI standards then you might wonder why `swaggie` is better than existing tools. Currently the most popular alternative is an open-source `NSwag`.

Quick comparison table:

| swaggie                                                         | NSwag                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| - Written in node.js                                            | - Written in .NET                                           |
| - Fast                                                          | - Slow                                                      |
| - ![swaggie size](https://packagephobia.now.sh/badge?p=swaggie) | - ![nswag size](https://packagephobia.now.sh/badge?p=nswag) |
| - Easy to contribute to                                         | - Contributing hard                                         |
| - Lightweight                                                   | - Complicated templates                                     |
| - Only features generating API clients for TS/JS                | - Many more features (but mostly for .NET apps)             |
