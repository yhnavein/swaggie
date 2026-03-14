---
layout: page
title: Playground
sidebar: false
---

<script setup>
import Playground from './.vitepress/components/Playground.vue'
</script>

<div class="pg-page-header">
  <h1>Playground</h1>
  <p>Paste an OpenAPI 3 spec, choose your settings, and generate a TypeScript client right in the browser — no installation required.</p>
</div>

<Playground />

<style>
/*
 * Strip VitePress's default page padding so the playground fills
 * the full content area edge-to-edge (horizontal padding is handled
 * by the component itself).
 */
.VPPage {
  padding: 0 !important;
}

/*
 * Make the content wrapper a flex column so the playground can
 * grow to fill the remaining viewport height below the nav.
 */
#VPContent {
  display: flex;
  flex-direction: column;
}

/* Let's hide the footer so the playground fills the full viewport height. */
.VPFooter {
  display: none;
}

.VPPage {
  display: flex;
  flex-direction: column;
  flex: 1;
}
</style>

<style scoped>
.pg-page-header {
  padding: 28px 24px 16px;
  text-align: center;
}

.pg-page-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 6px;
  border: none;
  line-height: 1.2;
}

.pg-page-header p {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0 auto;
  line-height: 1.5;
}
</style>
