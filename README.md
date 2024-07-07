<div style="text-align: center; margin: 0px auto 30px; max-width: 600px">
  <img src="./swaggie.svg" alt="Swaggie logo">
</div>

# Swaggie

![npm latest version](https://img.shields.io/npm/v/swaggie)
![NodeCI](https://github.com/yhnavein/swaggie/workflows/NodeCI/badge.svg)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/yhnavein/swaggie.svg)
![npm downloads](https://img.shields.io/npm/dw/swaggie.svg)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/swaggie.svg)
![npm install size](https://packagephobia.now.sh/badge?p=swaggie)

<!-- ![Dependencies](https://img.shields.io/david/yhnavein/swaggie.svg) -->

Generate ES6 or Typescript code from an OpenAPI 3.0 spec, so that accessing REST API resources from the client code is less error-prone, static-typed and just easier to use long-term.

You can take a look at the [Examples section](#example) down below.

Project is based and inspired by [OpenApi Client](https://github.com/mikestead/openapi-client).

## Install

In your project

    npm install swaggie --save-dev

Or globally to run CLI from anywhere

    npm install swaggie -g

## OpenAPI versions

Swaggie from version 1.0 supports OpenAPI 3.0 (and some features of 3.1). Swagger or OpenAPI v2 documents are not supported anymore, but you have few options how to deal with it:

- **(preferred)** From your backend server generate OpenAPI 3.0 spec instead of version 2 (samples are updated to use OpenAPI 3.0)
- Convert your OpenAPI 2.0 spec to 3.0 using [swagger2openapi](https://www.npmjs.com/package/swagger2openapi) tool (or something similar)
- If you can't do that for any reason, you can stick to `Swaggie v0.x`. But upgrade is suggested

Please note that OpenAPI 3.0 is a major spec upgrade and it's possible that there will be some breaking changes in the generated code.
I have tried my best to minimize the impact, but it was not possible to avoid it completely.

More info about breaking changes can be found in the [Releases](https://github.com/yhnavein/swaggie/releases).

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
```

Sample CLI usage using Swagger's Pet Store:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore/
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
  "src": "https://petstore3.swagger.io/api/v3/openapi.json",
  "template": "axios",
  "baseUrl": "/api",
  "preferAny": true,
  "servicePrefix": "",
  "dateFormat": "Date" // "string" | "Date"
}
```

### Templates

The following templates are bundled with Swaggie:

```
axios     Default template. Recommended for React / Vue / similar frameworks. Uses axios
xior      Lightweight and modern alternative to axios. Uses [xior](https://github.com/suhaotian/xior#intro)
swr-axios Template that embraces SRW for GET requests and as a fallback uses axios.
fetch     Template similar to axios, but with fetch API instead. Recommended for React / Vue / similar frameworks
ng1       Template for Angular 1 (this is for the old one)
ng2       Template for Angular 2+ (uses HttpClient, InjectionTokens, etc)
```

If you want to use your own template, you can use the path to your template for the `-t` parameter:

```
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore --template ./my-swaggie-template/
```

### Code

```javascript
const swaggie = require('swaggie');
swaggie
  .genCode({
    src: 'https://petstore3.swagger.io/api/v3/openapi.json',
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

> Please note that it's **recommended** to pipe Swaggie command to some prettifier like `prettier`, `biome` or `dprint` to make the generated code look not only nice, but also persistent.
> Because Swaggie relies on a templating engine, whitespaces are generally a mess, so they may change between versions.

### Suggested prettiers

[prettier](https://prettier.io/) - the most popular one

```sh
prettier ./FILE_PATH.ts --write
```

[biome](https://biomejs.dev) - the super fast one

```sh
biome check ./FILE_PATH.ts --apply-unsafe
```

You are not limited to any of these, but in our examples we will use Prettier. Please remember that these tools needs to be installed first and they need a config file in your project.

### Example

Let's run `swaggie` against PetStore API and see what will happen:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./api/petstore.ts && prettier ./api/petstore.ts --write
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

## Competitors

If you are familiar with the client-code generators for the Swagger / OpenAPI standards then you might wonder why `swaggie` is better than existing tools. Currently the most popular alternative is an open-source `NSwag`.

Quick comparison table:

| swaggie                                                       | NSwag                                                     | Hey API                                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Written in node.js + TypeScript                               | Written in .NET                                           | Written in TypeScript                                                       |
| Fast                                                          | Slow                                                      | Fast                                                                        |
| ![swaggie size](https://packagephobia.now.sh/badge?p=swaggie) | ![nswag size](https://packagephobia.now.sh/badge?p=nswag) | ![nswag size](https://packagephobia.now.sh/badge?p=%40hey-api%2Fopenapi-ts) |
| Easy to contribute to                                         | Contributing hard                                         | Does not allow custom templates, so change is hard                          |
| Lightweight                                                   | Complicated templates                                     | Generates a lot of code and multiple files                                  |
| Flexible, suits well in the existing apps                     | Flexible, suits well in the existing apps                 | Enforces usage of other tools and architecture                              |
| Generates REST clients and all models                         | Many more features (but mostly for .NET apps)             | No flexibility, other clients are discouraged from use                      |

## Notes

| Supported                                                                      | Not supported                              |
| ------------------------------------------------------------------------------ | ------------------------------------------ |
| OpenAPI 3                                                                      | Swagger 2                                  |
| `allOf`, `oneOf`, `anyOf`, `$ref` to schemas                                   | `not`                                      |
| Spec formats: `JSON`, `YAML`                                                   | Very complex query params                  |
| Extensions: `x-position`, `x-name`, `x-enumNames`, `x-enum-varnames`           | Multiple response types (one will be used) |
| Content types: `JSON`, `text`, `multipart/form-data`                           | Multiple request types (one will be used)  |
| Content types: `application/x-www-form-urlencoded`, `application/octet-stream` |                                            |
| Different types of enum definitions (+ OpenAPI 3.1 support for enums)          |                                            |
| Paths inheritance, comments (descriptions)                                     |                                            |
| Getting documents from remote locations or as path reference (local file)      |                                            |
| Grouping endpoints by tags + handle gracefully duplicate operation ids         |                                            |
