# Swaggie

[![Build Status](https://travis-ci.org/yhnavein/swaggie.svg?branch=master)](https://travis-ci.org/yhnavein/swaggie)
[![CircleCI](https://circleci.com/gh/yhnavein/swaggie.svg?style=svg)](https://circleci.com/gh/yhnavein/swaggie)
![Dependencies](https://img.shields.io/david/yhnavein/swaggie.svg)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/swaggie.svg)
![npm](https://img.shields.io/npm/dw/swaggie.svg)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/yhnavein/swaggie.svg)

Generate ES6 or Typescript service integration code from an OpenAPI 2.0 spec.

Project is based and inspired by [OpenApi Client](https://github.com/mikestead/openapi-client).

## Install

In your project

    npm install swaggie --save-dev

Or globally to run CLI from anywhere

    npm install swaggie -g

## Usage – Generating the API client

`swaggie` generates action creators in the `outDir` of your choosing. The rest of the examples assume that you've set `--outDir api-client`. You can generate the `api-client` either using the CLI, or in code.

### CLI

```
Usage: swaggie [options]

Options:

  -h, --help               output usage information
  -V, --version            output the version number
  -s, --src <url|path>     The url or path to the Open API spec file
  -o, --outDir <dir>       The path to the directory where files should be generated
  -b, --baseUrl <string>   Base URL that will be used as a default value in the clients. Default: ""
  -r, --reactHooks <bool>  Generate additional context that can be consumed in your application more easily. Requires React Hooks. Default: false
  --preferAny              Use "any" type instead of "unknown". Default: false
  --redux                  True if wanting to generate redux action creators
```

Sample CLI usage using Swagger's Pet Store:

```bash
swaggie -s https://petstore.swagger.io/v2/swagger.json -o ./client/petstore/
```

`swaggie` outputs TypeScript that is somehow formatted, but it's far from perfect. You can adjust the generated code by prettifying output using your preferred beautify tool using your repo's styling guidelines. For example involving `prettier` looks like this:

```bash
swaggie -s $URL -o ./client/petstore/ && prettier ./client/petstore/*.ts --write`
```

And this can be easily automated (in the npm scripts for example)

### Code

```javascript
const swaggie = require('swaggie')
swaggie.genCode({
  src: 'http://petstore.swagger.io/v2/swagger.json',
  outDir: './src/service',
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

### Using generated Redux action creators

You can use the generated API client directly. However, if you pass `--redux` or `redux: true` to `swaggie`, you will have generated Redux action creators to call your API (using a wrapper around `axios`). The following example assumes that you're using `react-redux` to wrap action creators in `dispatch`. You also need to use for example `redux-thunk` as middleware to allow async actions.

In your component:

```jsx
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import functional from 'react-functional';

import { getPetById } from '../api-client/action/pet';

const Pet = ({ actions, pet }) => (
  <div>
    {pet.name}
  </div>
)

// Dispatch an action to get the pet when the component mounts. Here we're using 'react-functional', but this could also be done using the class componentDidMount method
Pet.componentDidMount = ({ actions }) => actions.getPetById(id);

const mapStateToProps = state => (
  {
    pet: getPet(state) // a function that gets
  }
);

const mapDispatchToProps = dispatch => (
  {
    actions: bindActionCreators({ getPetById }, dispatch)
  }
);

export default connect( mapStateToProps, mapDispatchToProps)(functional(Pet));
```

The client can't generate your reducer for you as it doesn't know how merge the returned object into state, so you'll need to add a something to your reducer, such as:

```jsx
export default function reducer(state = initialState, action) {
  switch (action.type) {
    case GET_PET_BY_ID_START:
      return state.set('isFetching', true);
    case GET_PET_BY_ID: // When we actually have a pet returned
      if(!action.error){
        return state.merge({
          isFetching: false,
          pet: action.payload,
          error: null,
        });
      }
      else{ // handle an error
        return state.merge({
          isFetching: false,
          error: action.error,
        });
      }
    default:
      return state;
  }
}
```

