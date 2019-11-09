# Swaggie

[![Build Status](https://travis-ci.org/yhnavein/swaggie.svg?branch=master)](https://travis-ci.org/yhnavein/swaggie)
[![CircleCI](https://circleci.com/gh/yhnavein/swaggie.svg?style=svg)](https://circleci.com/gh/yhnavein/swaggie)
![Dependencies](https://img.shields.io/david/yhnavein/swaggie.svg)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/yhnavein/swaggie.svg)
![npm downloads](https://img.shields.io/npm/dw/swaggie.svg)
![npm latest version](https://img.shields.io/npm/v/swaggie)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/swaggie.svg)
![npm install size](https://packagephobia.now.sh/badge?p=swaggie)

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
  -s, --src <url|path>     The url or path to the Open API spec file
  -o, --out <path>         The path to the file where the API would be generated
  -b, --baseUrl <string>   Base URL that will be used as a default value in the clients. Default: ""
  -r, --reactHooks <bool>  Generate additional context that can be consumed in your application more easily. Requires React Hooks. Default: false
  --preferAny              Use "any" type instead of "unknown". Default: false
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

### Code

```javascript
const swaggie = require('swaggie')
swaggie.genCode({
  src: 'http://petstore.swagger.io/v2/swagger.json',
  out: './api/petstore.ts',
  reactHooks: true
})
.then(complete, error)

function complete(spec) {
  console.info('Service generation complete')
}

function error(e) {
  console.error(e.toString())
}
```

## Usage – Integrating into your project

### Using React Hooks Contexts

If you pass `-r` or `--reactHooks` parameter then additional React Contexts will be generated for you in the barrel file.

With that consuming generated Clients can be as easy as:

```javascript
import { useClient } from '../api-client';

export const YourLovelyComponent: React.FC = () => {
  const { authClient, petClient } = useClient();
```

## Example

Let's assume that you have a [PetStore API](http://petstore.swagger.io/) as your REST API and you are developing a client app written in TypeScript that will consume this API.

Instead of writing any code by hand for fetching particular resources, you could think that it might be possible to have this code generated for you somehow. And this is why this project exists.

Let's run `swaggie` against PetStore API and see what will happen:

```bash
swaggie -s https://petstore.swagger.io/v2/swagger.json -o ./api/petstore.ts && prettier ./api/petstore.ts --write
```

```typescript
// ./api/petstore.ts

import axios, { AxiosPromise } from 'axios';

export class petClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '';
  }

  /**
   * @param petId
   * @return Success
   */
  getPetById(petId: number): AxiosPromise<Pet> {
    let url = this.baseUrl + '/pet/{petId}';

    url = url.replace('{petId}', encodeURIComponent('' + petId));

    return axios.request<Pet>({
      url: url,
      method: 'GET',
    });
  }

  // ... and other methods ...
}
```

When we have that we can write some domain code and use this auto-generated classes:

```typescript
// app.ts

import {petClient} from './api/petClient';

const petApi = new petClient();
petApi.getPetById(123)
  .then(pet => console.log('Pet: ', pet));
```

If Petstore owners decide to remove method we use, then after running `swaggie` again it will no longer be present in the `petClient` class. This will result in the build error, which is very much appreciated at this stage.

Without this approach, the error would be spotted by our end-user and he/she would not appreciate it at all!

## Notes

If you are familiar with the client-code generators for the Swagger / OpenAPI standards then you might wonder why `swaggie` is better than existing tools. Currently the most popular alternative is an open-source `NSwag`.

There are few issues with that tool that we wanted to address in the development of `swaggie`:

* Very big package, which takes around **117 MB** of space. That's because NSwag is written in dotnet core (and distributed over NPM). Current NSwag stats:
![nswag size](https://packagephobia.now.sh/badge?p=nswag)
* Slow
* Contributing to the NSwag codebase is quite hard and complicated (as the code generator is just one of many NSwag functionalities)
* NSwag generates A LOT of code, which is not perfect as the generated code will be at some point part of the web app bundle. And we need to make it as small as possible
* We plan to implement fun features in future and lightweight templates for other frontend frameworks, which is not feasible in NSwag