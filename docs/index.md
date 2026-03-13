---
layout: home

hero:
  name: Swaggie
  text: Typed TypeScript clients from your OpenAPI spec
  tagline: Stop writing API-fetching code by hand. Point Swaggie at your OpenAPI 3 spec and get a fully typed, ready-to-use client in seconds.
  image:
    src: /swaggie.svg
    alt: Swaggie
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: View on GitHub
      link: https://github.com/yhnavein/swaggie

features:
  - icon: 🔒
    title: Fully Typed Output
    details: Every generated method has precise TypeScript types for parameters, request bodies, and responses. Catch breaking API changes at compile time, not in production.

  - icon: 🔌
    title: Multiple HTTP Clients
    details: Ships with templates for fetch, axios, xior, SWR + axios, TanStack Query + xior, Angular 1, and Angular 2+. Switch without rewriting your app logic.

  - icon: ⚡
    title: Zero Runtime Overhead
    details: Swaggie is a dev-only code generator — nothing is added to your production bundle. The output is a plain TypeScript file with no swaggie dependency at runtime.

  - icon: 🧩
    title: Handles Real-world Specs
    details: Full support for allOf, oneOf, anyOf, $ref (including external), nullable types, enums, multipart uploads, binary responses, and JSDoc from spec descriptions.

  - icon: 🌲
    title: Tree-shakeable Output
    details: Each API group is exported as its own named object, so your bundler can dead-code-eliminate anything you don't use.

  - icon: ✏️
    title: Custom Templates
    details: Don't see your HTTP client? Bring your own EJS template directory and Swaggie will use it instead. Full access to parsed operation and schema data.
---
