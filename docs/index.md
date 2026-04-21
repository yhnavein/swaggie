---
layout: home

hero:
  name: Swaggie
  tagline: Stop writing API-fetching code by hand. Point Swaggie at your OpenAPI 3 spec and get a fully typed, ready-to-use client in seconds.
  image:
    src: /swaggie-full.png
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
    details: Ships with templates for fetch, axios, xior, ky, Angular 1, and Angular 2+. Switch without rewriting your app logic. Need reactivity? Layer SWR or TanStack Query on top of any compatible client.

  - icon: ⚡
    title: Zero Runtime Overhead
    details: Swaggie is a dev-only code generator — nothing is added to your production bundle. The output is a plain TypeScript file with no swaggie dependency at runtime.

  - icon: 🧩
    title: Handles Real-world Specs
    details: Full support for allOf, oneOf, anyOf, $ref (including external), nullable types, enums, multipart uploads, binary responses, and JSDoc from spec descriptions.

  - icon: 🌲
    title: Tree-shakeable Output
    details: Each API group is exported as its own named object, so your bundler can dead-code-eliminate anything you don't use.

  - icon: 🧪
    title: Automatic Mock Generation
    details: Generate typed mock/stub files alongside your client for Vitest or Jest. Every method and hook gets a typed spy, with ergonomic helpers like mockSWR() and mockQuery() — drop them straight into your tests.
---

<script setup>
import Button from './.vitepress/components/Button.vue';
</script>

<div style="text-align: center; padding: 48px 24px 0;">
  <p style="font-size: 1rem; color: var(--vp-c-text-2); margin-bottom: 24px;">
    Want to see Swaggie in action before committing to an install?<br>
    Try the interactive Playground and generate a typed client from any OpenAPI spec — right in your browser.
  </p>
  <a href="/swaggie/playground.html" style="text-decoration: none;">
    <Button style="font-size: 1rem;">Open Playground</Button>
  </a>
</div>

<style>
@media (min-width: 960px) {
  .image-container .image-src {
    max-width: 462px;
    max-height: 320px;
  }
}
</style>
