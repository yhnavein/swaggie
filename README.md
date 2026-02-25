<div style="text-align: center; margin: 0px auto 30px; max-width: 600px">
  <img src="./swaggie.svg" alt="Swaggie logo">
</div>

# Swaggie

![npm latest version](https://img.shields.io/npm/v/swaggie)
![NodeCI](https://github.com/yhnavein/swaggie/workflows/NodeCI/badge.svg)
![Test Coverage](https://img.shields.io/badge/test_coverage-98%25-brightgreen)
![npm downloads](https://img.shields.io/npm/dw/swaggie.svg)
![npm install size](https://packagephobia.now.sh/badge?p=swaggie)

Generate Typescript code from an OpenAPI 3.0 document, so that accessing REST API resources from the client code is less error-prone, static-typed and just easier to use long-term.

You can take a look at the [Examples section](#example) down below.

Project is based and inspired by [OpenApi Client](https://github.com/mikestead/openapi-client).

### Features

- Generate TypeScript code from OpenAPI 3.0 spec
- Supports `fetch`, `axios`, `xior`, `SWR + axios`, `Angular 1`, `Angular 2+` templates. It's flexible.
- Possible to create your own template that works with your existing codebase
- It's a dev tool that generates code, so it's not a runtime dependency
- Support for `allOf`, `oneOf`, `anyOf` and `$ref` in schemas
- Support for different types of enums
- Support for different content types
- JSDoc comments for generated code
- Small library size and very small and tree-shakable output that is all placed in one file
- OpenAPI 3.1 is partially supported (mostly enums, more to come)

## Install

In your project

    npm install swaggie --save-dev

Or globally to run CLI from anywhere

    npm install swaggie -g

## OpenAPI versions

Swaggie from version 1.0 supports OpenAPI 3.0 (and some features of 3.1). Swagger or OpenAPI 2.0 documents are not supported anymore, but you have few options how to deal with it:

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

  -V, --version             output the version number
  -c, --config <path>       The path to the configuration JSON file. You can do all the set up there instead of parameters in the CLI
  -s, --src <url|path>      The url or path to the Open API spec file
  -o, --out <filePath>      The path to the file where the API would be generated. Use stdout if left empty
  -b, --baseUrl <string>    Base URL that will be used as a default value in the clients (default: "")
  -t, --template <string>   Template used for generating API client. Default: "axios"
  --preferAny               Use "any" type instead of "unknown" (default: false)
  --skipDeprecated          Skip deprecated operations. When enabled, deprecated operations will be skipped from the generated code (default: false)
  --servicePrefix <string>  Prefix for service names. Useful when you have multiple APIs and you want to avoid name collisions (default: "")
  --allowDots <bool>        Determines if dots should be used for serialization object properties
  --arrayFormat <format>    Determines how arrays should be serialized (choices: "indices", "repeat", "brackets")
  -h, --help                display help for command
```

Sample CLI usage using Swagger's Pet Store:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore.ts
```

`swaggie` outputs TypeScript that is somehow formatted, but it's far from perfect. You can adjust the generated code by prettifying output using your preferred beautify tool using your repo's styling guidelines. For example involving `prettier` looks like this:

```bash
swaggie -s $URL -o ./client/petstore.ts && prettier ./client/petstore.ts --write`
```

And this can be easily automated (in the `npm` scripts for example)

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
  "dateFormat": "Date", // "string" | "Date"
  "nullableStrategy": "ignore", // "ignore" | "include" | "nullableAsOptional"
  "queryParamsSerialization": {
    "arrayFormat": "repeat", // "repeat" | "brackets" | "indices"
    "allowDots": true
  }
}
```

### Templates

The following templates are bundled with Swaggie:

```
axios       Default template. Recommended for React / Vue / similar frameworks. Uses axios
xior        Lightweight and modern alternative to axios. Uses [xior](https://github.com/suhaotian/xior#intro)
swr-axios   SWR for GET requests with axios as backend
tsq-xior    TanStack Query for GET requests with xior as backend
fetch       Barebone fetch API. Recommended for React / Vue / similar frameworks
ng1         Angular 1 client (this is for the old one)
ng2         Angular 2+ client (uses HttpClient, InjectionTokens, etc)
```

If you want to use your own template, you can use the path to your template for the `-t` parameter:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore --template ./my-swaggie-template/
```

## Usage – Integrating into your project

Let's assume that you have a [PetStore API](http://petstore.swagger.io/) as your REST API and you are developing a client app written in TypeScript that will consume this API.

Instead of writing any code by hand for fetching particular resources, we will let Swaggie do it for us.

### Query Parameters Serialization

When it comes to use of query parameters then you might need to adjust the way these parameters will be serialized, as backend server you are using expects them to be in a specific format. Thankfully in Swaggie you can specify how they should be handled. If you won't provide any configuration, then Swaggie will use the defaults values expected in the ASP.NET Core world.

For your convenience there are few config examples to achieve different serialization formats for an object `{ "a": { "b": 1 }, "c": [2, 3] }`:

| Expected Format         | allowDots | arrayFormat |
| ----------------------- | --------- | ----------- |
| `?a.b=1&c=2&c=3`        | `true`    | `repeat`    |
| `?a.b=1&c[]=2&c[]=3`    | `true`    | `brackets`  |
| `?a.b=1&c[0]=2&c[1]=3`  | `true`    | `indices`   |
| `?a[b]=1&c=2&c=3`       | `false`   | `repeat`    |
| `?a[b]=1&c[]=2&c[]=3`   | `false`   | `brackets`  |
| `?a[b]=1&c[0]=2&c[1]=3` | `false`   | `indices`   |

Once you know what your backend expects, you can adjust the configuration file accordingly: (below are default values)

```json
{
  "queryParamsSerialization": {
    "arrayFormat": "repeat",
    "allowDots": true
  }
}
```

### Nullable Strategy

OpenAPI 3.0 allows marking fields as `nullable: true`. Swaggie provides three strategies for translating this into TypeScript, controlled by the `nullableStrategy` option:

| Value                  | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `"ignore"` (default)   | `nullable: true` is ignored. Types are generated as if `nullable` was not set.     |
| `"include"`            | `nullable: true` appends `\| null` to the TypeScript type (e.g. `string \| null`). |
| `"nullableAsOptional"` | `nullable: true` makes the property optional (`?`) instead of adding `\| null`.    |

**Examples** for a schema with `tenant: { type: 'string', nullable: true }` (required):

```typescript
// nullableStrategy: "ignore"   →  tenant: string;
// nullableStrategy: "include"  →  tenant: string | null;
// nullableStrategy: "nullableAsOptional"  →  tenant?: string;
```

### Code Quality

> Please note that it's **recommended** to pipe Swaggie command to some prettifier like `prettier`, `biome` or `dprint` to make the generated code look not only nice, but also persistent.
> Because Swaggie relies on a templating engine, whitespaces are generally a mess, so they may change between versions.

**Suggested prettiers**

[prettier](https://prettier.io/) - the most popular one

```bash
prettier ./FILE_PATH.ts --write
```

[biome](https://biomejs.dev) - the super fast one

```bash
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
  paramsSerializer: (params) =>
    encodeParams(params, null, {
      allowDots: true,
      arrayFormat: 'repeat',
    }),
});

/** [...] **/

export const petClient = {
  /**
   * @param petId
   */
  getPetById(petId: number): AxiosPromise<Pet> {
    let url = `/pet/${encodeURIComponent(`${petId}`)}`;

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

## Other features

### Parameter adjustment

In some cases you might want to adjust the parameters globally but without touching the OpenAPI spec. For example, the spec may explicitly define some of parameters as `required`, but you will handle them in the interceptor. In such case, you don't want to define them is every single method. This is where this feature comes in handy.

Example (in the config file):

```json
{
  "modifiers": {
    "parameters": {
      "clientId": "ignore",
      "orgId": "optional",
      "country": "required"
    }
  }
}
```

This will ensure that `clientId` parameters will never appear in any of the generated methods, and `orgId` will be optional (regardless of what the spec says).
You can also use `required` value to enforce the parameter to be required, _(but in this case, realistically it would be better to just fix the spec)_.

## Server config

You might wonder how to set up server to fully utilize Swaggie's features. For that I've added a `samples/` folder with sample configurations.

[ASP.NET Core + Nswag](./samples/dotnetcore/nswag/README.md)

[ASP.NET Core + Swashbuckle](./samples/dotnetcore/swashbuckle/README.md)

Server is not necessary to use Swaggie. Swaggie cares only about the JSON/yaml file with the Open API spec, but for your development purpose you might want to have a server that can serve this file automatically from the actual endpoints.

## Using Swaggie programmatically

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

## Notes

| Supported                                                                      | Not supported                                   |
| ------------------------------------------------------------------------------ | ----------------------------------------------- |
| OpenAPI 3, OpenAPI 3.1, OpenAPI 3.2                                            | Swagger, Open API 2.0                           |
| `allOf`, `oneOf`, `anyOf`, `$ref` to schemas                                   | `not`                                           |
| Spec formats: `JSON`, `YAML`                                                   | VERY complex query params                       |
| Extensions: `x-position`, `x-name`, `x-enumNames`, `x-enum-varnames`           | Multiple response types (only one will be used) |
| Content types: `JSON`, `text`, `multipart/form-data`                           | Multiple request types (only one will be used)  |
| Content types: `application/x-www-form-urlencoded`, `application/octet-stream` | References to external spec files               |
| Different types of enum definitions                                            | OpenAPI callbacks                               |
| Paths inheritance, comments (descriptions), nullable, `["<TYPE>", null]`       | OpenAPI webhooks                                |
| Getting documents from remote locations or as path reference (local file)      |                                                 |
| Grouping endpoints by tags + handle gracefully duplicate operation ids         |                                                 |

## Used by

<div style="display: flex; gap: 1rem;">
<a href="https://www.britishcouncil.org"><img alt="British Council" src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/BritishCouncil.png/320px-BritishCouncil.png" style="height: 50px;" /></a>
<a href="https://kpmg.com/"><img alt="KPMG" src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/KPMG.svg/320px-KPMG.svg.png" style="height: 50px;" /></a>
<a href="https://klarna.com/"><img alt="Klarna" src="https://upload.wikimedia.org/wikipedia/commons/4/40/Klarna_Payment_Badge.svg" style="height: 50px;" /></a>
</div>
