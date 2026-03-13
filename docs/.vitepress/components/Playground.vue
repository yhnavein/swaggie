<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { runCodeGenerator } from 'swaggie/browser';
import { parse as parseYaml } from 'yaml';
import { codeToHtml } from 'shiki';

// ─── Settings — primary row ───────────────────────────────────────────────────

const template = ref<string>('axios');
const generationMode = ref<string>('full');
const schemaStyle = ref<string>('interface');
const enumStyle = ref<string>('union');
const nullableStrategy = ref<string>('ignore');
const baseUrl = ref<string>('');
const skipDeprecated = ref<boolean>(false);

// ─── Settings — advanced (expanded) row ──────────────────────────────────────

const showAdvanced = ref<boolean>(false);
const dateFormat = ref<string>('Date');
const preferAny = ref<boolean>(false);
const servicePrefix = ref<string>('');
const allowDots = ref<boolean>(true);
const arrayFormat = ref<string>('repeat');

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
      skipDeprecated: skipDeprecated.value,
      dateFormat: dateFormat.value as any,
      preferAny: preferAny.value,
      servicePrefix: servicePrefix.value || undefined,
      queryParamsSerialization: {
        allowDots: allowDots.value,
        arrayFormat: arrayFormat.value as any,
      },
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
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // Clipboard not available (e.g., non-secure context)
  }
}
</script>

<template>
  <div class="playground">
    <!-- ── Settings bar ─────────────────────────────────────────── -->
    <div class="pg-settings">

      <!-- Primary row -->
      <div class="pg-settings-row">

        <label class="pg-field">
          <span class="pg-label">Template</span>
          <div class="pg-select-wrap">
            <select v-model="template" class="pg-select">
              <option value="axios">axios</option>
              <option value="fetch">fetch</option>
              <option value="xior">xior</option>
              <option value="swr-axios">swr-axios</option>
              <option value="tsq-xior">tsq-xior</option>
              <option value="ng1">ng1</option>
              <option value="ng2">ng2</option>
            </select>
            <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">Mode</span>
          <div class="pg-select-wrap">
            <select v-model="generationMode" class="pg-select">
              <option value="full">full</option>
              <option value="schemas">schemas</option>
            </select>
            <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">Schema style</span>
          <div class="pg-select-wrap">
            <select v-model="schemaStyle" class="pg-select">
              <option value="interface">interface</option>
              <option value="type">type</option>
            </select>
            <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">Enum style</span>
          <div class="pg-select-wrap">
            <select v-model="enumStyle" class="pg-select">
              <option value="union">union</option>
              <option value="enum">enum</option>
            </select>
            <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">Nullable</span>
          <div class="pg-select-wrap">
            <select v-model="nullableStrategy" class="pg-select">
              <option value="ignore">ignore</option>
              <option value="include">include</option>
              <option value="nullableAsOptional">nullableAsOptional</option>
            </select>
            <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
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

        <label class="pg-field pg-field--checkbox">
          <span class="pg-label">Skip deprecated</span>
          <div class="pg-checkbox-wrap">
            <input
              v-model="skipDeprecated"
              type="checkbox"
              class="pg-checkbox"
              id="skipDeprecated"
            />
            <label for="skipDeprecated" class="pg-toggle" />
          </div>
        </label>

        <!-- Spacer to push buttons to the right -->
        <div class="pg-spacer" />

        <!-- Expand / collapse advanced -->
        <button
          class="pg-btn pg-btn--ghost"
          @click="showAdvanced = !showAdvanced"
          :aria-expanded="showAdvanced"
          type="button"
        >
          <svg
            class="pg-chevron-btn"
            :class="{ 'pg-chevron-btn--open': showAdvanced }"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ showAdvanced ? 'Less' : 'More' }}
        </button>

        <button
          class="pg-btn"
          :disabled="isLoading"
          @click="generate"
          type="button"
        >
          <span v-if="isLoading" class="pg-spinner" aria-hidden="true" />
          <span>{{ isLoading ? 'Generating…' : 'Generate' }}</span>
        </button>
      </div>

      <!-- Advanced row (collapsible) -->
      <Transition name="pg-expand">
        <div v-if="showAdvanced" class="pg-settings-row pg-settings-row--advanced">

          <label class="pg-field">
            <span class="pg-label">Date format</span>
            <div class="pg-select-wrap">
              <select v-model="dateFormat" class="pg-select">
                <option value="Date">Date</option>
                <option value="string">string</option>
              </select>
              <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </label>

          <label class="pg-field">
            <span class="pg-label">Array format</span>
            <div class="pg-select-wrap">
              <select v-model="arrayFormat" class="pg-select">
                <option value="repeat">repeat</option>
                <option value="brackets">brackets</option>
                <option value="indices">indices</option>
              </select>
              <svg class="pg-chevron" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </label>

          <label class="pg-field pg-field--wide">
            <span class="pg-label">Service prefix</span>
            <input
              v-model="servicePrefix"
              type="text"
              placeholder="e.g. Petstore"
              class="pg-input"
            />
          </label>

          <label class="pg-field pg-field--checkbox">
            <span class="pg-label">Allow dots</span>
            <div class="pg-checkbox-wrap">
              <input
                v-model="allowDots"
                type="checkbox"
                class="pg-checkbox"
                id="allowDots"
              />
              <label for="allowDots" class="pg-toggle" />
            </div>
          </label>

          <label class="pg-field pg-field--checkbox">
            <span class="pg-label">Prefer any</span>
            <div class="pg-checkbox-wrap">
              <input
                v-model="preferAny"
                type="checkbox"
                class="pg-checkbox"
                id="preferAny"
              />
              <label for="preferAny" class="pg-toggle" />
            </div>
          </label>

        </div>
      </Transition>
    </div>

    <!-- ── Error banner ──────────────────────────────────────────── -->
    <div v-if="errorMessage" class="pg-error" role="alert">
      <strong>Error:</strong> {{ errorMessage }}
    </div>

    <!-- ── Two-column editor ─────────────────────────────────────── -->
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
            type="button"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <div class="pg-output">
          <div v-if="outputHtml" class="pg-highlighted" v-html="outputHtml" />

          <div v-else-if="isLoading" class="pg-placeholder">
            <div class="pg-skeleton pg-skeleton--short" />
            <div class="pg-skeleton pg-skeleton--long" />
            <div class="pg-skeleton pg-skeleton--medium" />
            <div class="pg-skeleton pg-skeleton--long" />
            <div class="pg-skeleton pg-skeleton--short" />
          </div>

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
  min-height: calc(100vh - var(--vp-nav-height) - 120px);
}

.pg-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
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

/* ── Settings box ────────────────────────────────────────────────── */

.pg-settings {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.pg-settings-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 14px;
}

.pg-settings-row--advanced {
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
}

/* ── Fields ──────────────────────────────────────────────────────── */

.pg-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 110px;
}

.pg-field--wide {
  min-width: 180px;
  flex: 1;
}

.pg-field--checkbox {
  min-width: unset;
}

.pg-spacer {
  flex: 1;
}

.pg-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ── Custom select (with chevron) ────────────────────────────────── */

.pg-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pg-select {
  /* Reset browser default appearance completely */
  appearance: none;
  -webkit-appearance: none;
  height: 34px;
  /* Extra right padding reserves space for the chevron icon */
  padding: 0 32px 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
  width: 100%;
}

.pg-select:focus {
  border-color: var(--vp-c-brand-1);
}

.pg-chevron {
  position: absolute;
  right: 9px;
  width: 12px;
  height: 12px;
  color: var(--vp-c-text-3);
  pointer-events: none;
  flex-shrink: 0;
}

/* ── Text input ──────────────────────────────────────────────────── */

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
  width: 100%;
  box-sizing: border-box;
}

.pg-input:focus {
  border-color: var(--vp-c-brand-1);
}

/* ── Toggle checkbox ─────────────────────────────────────────────── */

.pg-checkbox-wrap {
  position: relative;
  height: 34px;
  display: flex;
  align-items: center;
}

/* Hide the real checkbox but keep it accessible */
.pg-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* The visual toggle track */
.pg-toggle {
  display: inline-block;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--vp-c-divider);
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

/* The toggle thumb */
.pg-toggle::after {
  content: '';
  display: block;
  width: 14px;
  height: 14px;
  margin: 3px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.pg-checkbox:checked + .pg-toggle {
  background: var(--vp-c-brand-1);
}

.pg-checkbox:checked + .pg-toggle::after {
  transform: translateX(16px);
}

.pg-checkbox:focus-visible + .pg-toggle {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

/* ── Buttons ─────────────────────────────────────────────────────── */

.pg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 18px;
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
  flex-shrink: 0;
}

.pg-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.pg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pg-btn--ghost {
  background: transparent;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

.pg-btn--ghost:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

/* Chevron inside the More/Less button */
.pg-chevron-btn {
  width: 12px;
  height: 12px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.pg-chevron-btn--open {
  transform: rotate(180deg);
}

/* ── Expand/collapse transition ──────────────────────────────────── */

.pg-expand-enter-active,
.pg-expand-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease, padding 0.25s ease;
  overflow: hidden;
  max-height: 200px;
}

.pg-expand-enter-from,
.pg-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
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

.pg-highlighted :deep(pre.shiki) {
  margin: 0;
  padding: 14px;
  border-radius: 0;
  flex: 1;
  box-sizing: border-box;
  font-size: 12.5px;
  line-height: 1.6;
  overflow: auto;
  background: #0d1117 !important;
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
