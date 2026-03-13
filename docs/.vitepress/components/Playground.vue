<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { runCodeGenerator } from 'swaggie/browser';
import { parse as parseYaml } from 'yaml';
import { codeToHtml } from 'shiki';

// ─── Settings ────────────────────────────────────────────────────────────────

const template = ref<string>('axios');
const generationMode = ref<string>('full');
const schemaStyle = ref<string>('interface');
const enumStyle = ref<string>('union');
const nullableStrategy = ref<string>('ignore');
const baseUrl = ref<string>('');

// ─── State ───────────────────────────────────────────────────────────────────

const specInput = ref<string>('');
const outputHtml = ref<string>('');
const outputRaw = ref<string>('');
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');
const copied = ref<boolean>(false);

// ─── Example spec (PetStore mini) ────────────────────────────────────────────

const EXAMPLE_SPEC = `openapi: "3.0.3"
info:
  title: Pet Store
  version: "1.0.0"
paths:
  /pets:
    get:
      operationId: listPets
      summary: List all pets
      tags: [pets]
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
      responses:
        "200":
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Pet"
    post:
      operationId: createPet
      summary: Create a pet
      tags: [pets]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewPet"
      responses:
        "201":
          description: Created pet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
  /pets/{petId}:
    get:
      operationId: getPetById
      summary: Get a pet by ID
      tags: [pets]
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: A single pet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        "404":
          description: Pet not found
    delete:
      operationId: deletePet
      summary: Delete a pet
      tags: [pets]
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "204":
          description: Pet deleted
components:
  schemas:
    Pet:
      type: object
      required: [id, name]
      properties:
        id:
          type: integer
        name:
          type: string
        tag:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
    NewPet:
      type: object
      required: [name]
      properties:
        name:
          type: string
        tag:
          type: string
`;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  specInput.value = EXAMPLE_SPEC;
  await generate();
});

// ─── Code generation ──────────────────────────────────────────────────────────

async function parseSpec(input: string): Promise<object> {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  return parseYaml(trimmed);
}

async function renderHighlighted(code: string): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang: 'typescript',
      theme: 'github-dark',
    });
  } catch {
    // Fallback: plain pre/code if Shiki fails
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="shiki-fallback"><code>${escaped}</code></pre>`;
  }
}

async function generate() {
  if (!specInput.value.trim()) {
    errorMessage.value = 'Paste an OpenAPI spec to get started.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  outputHtml.value = '';
  outputRaw.value = '';

  try {
    const parsed = await parseSpec(specInput.value);

    const [code] = await runCodeGenerator({
      src: parsed as any,
      template: template.value as any,
      baseUrl: baseUrl.value || undefined,
      generationMode: generationMode.value as any,
      schemaDeclarationStyle: schemaStyle.value as any,
      enumDeclarationStyle: enumStyle.value as any,
      nullableStrategy: nullableStrategy.value as any,
    });

    outputRaw.value = code;
    outputHtml.value = await renderHighlighted(code);
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────

async function copyToClipboard() {
  if (!outputRaw.value) return;
  try {
    await navigator.clipboard.writeText(outputRaw.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard not available (e.g., non-secure context)
  }
}
</script>

<template>
  <div class="playground">
    <!-- Settings bar -->
    <div class="pg-settings">
      <label class="pg-field">
        <span class="pg-label">Template</span>
        <select v-model="template" class="pg-select">
          <option value="axios">axios</option>
          <option value="fetch">fetch</option>
          <option value="xior">xior</option>
          <option value="swr-axios">swr-axios</option>
          <option value="tsq-xior">tsq-xior</option>
          <option value="ng1">ng1</option>
          <option value="ng2">ng2</option>
        </select>
      </label>

      <label class="pg-field">
        <span class="pg-label">Mode</span>
        <select v-model="generationMode" class="pg-select">
          <option value="full">full</option>
          <option value="schemas">schemas</option>
        </select>
      </label>

      <label class="pg-field">
        <span class="pg-label">Schema style</span>
        <select v-model="schemaStyle" class="pg-select">
          <option value="interface">interface</option>
          <option value="type">type</option>
        </select>
      </label>

      <label class="pg-field">
        <span class="pg-label">Enum style</span>
        <select v-model="enumStyle" class="pg-select">
          <option value="union">union</option>
          <option value="enum">enum</option>
        </select>
      </label>

      <label class="pg-field">
        <span class="pg-label">Nullable</span>
        <select v-model="nullableStrategy" class="pg-select">
          <option value="ignore">ignore</option>
          <option value="include">include</option>
          <option value="nullableAsOptional">nullableAsOptional</option>
        </select>
      </label>

      <label class="pg-field pg-field--wide">
        <span class="pg-label">Base URL</span>
        <input
          v-model="baseUrl"
          type="text"
          placeholder="https://api.example.com"
          class="pg-input"
        />
      </label>

      <button
        class="pg-btn"
        :disabled="isLoading"
        @click="generate"
      >
        <span v-if="isLoading" class="pg-spinner" aria-hidden="true" />
        <span>{{ isLoading ? 'Generating…' : 'Generate' }}</span>
      </button>
    </div>

    <!-- Error banner -->
    <div v-if="errorMessage" class="pg-error" role="alert">
      <strong>Error:</strong> {{ errorMessage }}
    </div>

    <!-- Two-column editor -->
    <div class="pg-columns">
      <!-- Left: spec input -->
      <div class="pg-panel">
        <div class="pg-panel-header">
          <span class="pg-panel-title">OpenAPI Spec</span>
          <span class="pg-panel-hint">YAML or JSON</span>
        </div>
        <textarea
          v-model="specInput"
          class="pg-textarea"
          spellcheck="false"
          autocorrect="off"
          autocapitalize="off"
          placeholder="Paste your OpenAPI 3 spec here (YAML or JSON)…"
        />
      </div>

      <!-- Right: generated TypeScript -->
      <div class="pg-panel">
        <div class="pg-panel-header">
          <span class="pg-panel-title">Generated TypeScript</span>
          <button
            v-if="outputRaw"
            class="pg-copy-btn"
            :class="{ 'pg-copy-btn--done': copied }"
            @click="copyToClipboard"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <div class="pg-output">
          <!-- Highlighted output -->
          <div
            v-if="outputHtml"
            class="pg-highlighted"
            v-html="outputHtml"
          />

          <!-- Loading skeleton -->
          <div v-else-if="isLoading" class="pg-placeholder">
            <div class="pg-skeleton pg-skeleton--short" />
            <div class="pg-skeleton pg-skeleton--long" />
            <div class="pg-skeleton pg-skeleton--medium" />
            <div class="pg-skeleton pg-skeleton--long" />
            <div class="pg-skeleton pg-skeleton--short" />
          </div>

          <!-- Empty state -->
          <div v-else class="pg-empty">
            <p>Output will appear here after you click <strong>Generate</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────── */

.playground {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 24px 24px;
  font-family: var(--vp-font-family-base);
  /* Fill the remaining viewport height below the header */
  min-height: calc(100vh - var(--vp-nav-height) - 120px);
}

.pg-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  /* Panels grow to fill the remaining space */
  min-height: 0;
}

@media (max-width: 768px) {
  .playground {
    padding: 0 12px 16px;
  }
  .pg-columns {
    grid-template-columns: 1fr;
  }
}

/* ── Settings bar ────────────────────────────────────────────────── */

.pg-settings {
  position: sticky;
  top: 5em;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.pg-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 110px;
}

.pg-field--wide {
  min-width: 200px;
  flex: 1;
}

.pg-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pg-select,
.pg-input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.pg-select:focus,
.pg-input:focus {
  border-color: var(--vp-c-brand-1);
}

.pg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 20px;
  margin-top: auto;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
}

.pg-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.pg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Spinner ─────────────────────────────────────────────────────── */

.pg-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Error banner ────────────────────────────────────────────────── */

.pg-error {
  padding: 10px 16px;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger-1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--vp-c-danger-1);
}

/* ── Panels ──────────────────────────────────────────────────────── */

.pg-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
  /* Grow to fill the grid row */
  min-height: 0;
  max-height: calc(100vh - 264px);
}

.pg-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

.pg-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.pg-panel-hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

/* ── Textarea (left panel) ───────────────────────────────────────── */

.pg-textarea {
  flex: 1;
  resize: none;
  padding: 14px;
  border: none;
  outline: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.6;
  tab-size: 2;
  /* Grow to fill panel; min-height just for very small screens */
  min-height: 300px;
}

/* ── Output (right panel) ────────────────────────────────────────── */

.pg-output {
  flex: 1;
  overflow: auto;
  min-height: 300px;
  position: relative;
}

.pg-highlighted {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Override Shiki's pre to fill the panel */
.pg-highlighted :deep(pre.shiki) {
  margin: 0;
  padding: 14px;
  border-radius: 0;
  flex: 1;
  box-sizing: border-box;
  font-size: 12.5px;
  line-height: 1.6;
  overflow: auto;
  background: #0d1117 !important; /* github-dark bg */
}

.pg-highlighted :deep(pre.shiki code) {
  font-family: var(--vp-font-family-mono);
}

/* ── Empty / loading states ──────────────────────────────────────── */

.pg-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 24px;
  color: var(--vp-c-text-3);
  font-size: 13px;
  text-align: center;
}

.pg-placeholder {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pg-skeleton {
  height: 12px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  animation: shimmer 1.4s ease-in-out infinite;
}

.pg-skeleton--short  { width: 40%; }
.pg-skeleton--medium { width: 65%; }
.pg-skeleton--long   { width: 90%; }

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ── Copy button ─────────────────────────────────────────────────── */

.pg-copy-btn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.pg-copy-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pg-copy-btn--done {
  background: var(--vp-c-green-soft);
  border-color: var(--vp-c-green-1);
  color: var(--vp-c-green-1);
}
</style>
