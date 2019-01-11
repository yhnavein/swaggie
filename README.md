# Swaggie

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

  -h, --help              output usage information
  -V, --version           output the version number
  -s, --src <url|path>    The url or path to the Open API spec file
  -o, --outDir <dir>      The path to the directory where files should be generated
  --redux                 True if wanting to generate redux action creators
```

### Code

```javascript
const swaggie = require('swaggie')
swaggie.genCode({
  src: 'http://petstore.swagger.io/v2/swagger.json',
  outDir: './src/service',
  redux: true
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

### Using generated Redux action creators

You can use the generated API client directly. However, if you pass `--redux` or `redux: true` to `swaggie`, you will have generated Redux action creators to call your API (using a wrapper around `fetch`). The following example assumes that you're using `react-redux` to wrap action creators in `dispatch`. You also need to use for example `redux-thunk` as middleware to allow async actions.

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

