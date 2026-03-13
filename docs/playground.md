---
layout: page
title: Playground
---

<script setup>
import Playground from './.vitepress/components/Playground.vue'
</script>

<div class="pg-page-header">
  <h1>Playground</h1>
  <p>Paste an OpenAPI 3 spec, choose your settings, and generate a TypeScript client right in the browser — no installation required.</p>
</div>

<Playground />

<style scoped>
.pg-page-header {
  padding: 40px 0 24px;
  text-align: center;
}

.pg-page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
  border: none;
}

.pg-page-header p {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  max-width: 560px;
  margin: 0 auto;
}
</style>
