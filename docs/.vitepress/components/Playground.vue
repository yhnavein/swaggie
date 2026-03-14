<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { runCodeGenerator } from 'swaggie/browser';
import { parse as parseYaml } from 'yaml';
import { codeToHtml } from 'shiki';
import HintIcon from './HintIcon.vue';
import ChevronDownIcon from './ChevronDownIcon.vue';
import Button from './Button.vue';
import { EXAMPLE_SPEC, EXAMPLE_SPECS, HINTS } from '../data';

// ─── Session storage helpers ──────────────────────────────────────────────────

const SESSION_KEY = 'swaggie-playground';

function loadSession(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSession(patch: Record<string, unknown>) {
  try {
    const current = loadSession();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // sessionStorage unavailable (SSR, private mode, quota)
  }
}

function s<T>(key: string, fallback: T): T {
  const saved = loadSession()[key];
  return saved !== undefined ? (saved as T) : fallback;
}

// ─── Settings — primary row ───────────────────────────────────────────────────

const template = ref<string>(s('template', 'axios'));
const generationMode = ref<string>(s('generationMode', 'full'));
const schemaStyle = ref<string>(s('schemaStyle', 'interface'));
const enumStyle = ref<string>(s('enumStyle', 'union'));
const nullableStrategy = ref<string>(s('nullableStrategy', 'ignore'));
const baseUrl = ref<string>(s('baseUrl', ''));
const skipDeprecated = ref<boolean>(s('skipDeprecated', false));

// ─── Settings — advanced row ──────────────────────────────────────────────────

const showAdvanced = ref<boolean>(s('showAdvanced', false));
const dateFormat = ref<string>(s('dateFormat', 'Date'));
const preferAny = ref<boolean>(s('preferAny', false));
const servicePrefix = ref<string>(s('servicePrefix', ''));
const allowDots = ref<boolean>(s('allowDots', true));
const arrayFormat = ref<string>(s('arrayFormat', 'repeat'));

// ─── State ───────────────────────────────────────────────────────────────────

const specInput = ref<string>('');
const outputHtml = ref<string>('');
const outputRaw = ref<string>('');
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');
const copied = ref<boolean>(false);

// ─── Code generation ──────────────────────────────────────────────────────────

async function parseSpec(input: string): Promise<object> {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  return parseYaml(trimmed);
}

async function renderHighlighted(code: string): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang: 'typescript',
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
  } catch {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

    saveSession({
      template: template.value,
      generationMode: generationMode.value,
      schemaStyle: schemaStyle.value,
      enumStyle: enumStyle.value,
      nullableStrategy: nullableStrategy.value,
      baseUrl: baseUrl.value,
      skipDeprecated: skipDeprecated.value,
      showAdvanced: showAdvanced.value,
      dateFormat: dateFormat.value,
      preferAny: preferAny.value,
      servicePrefix: servicePrefix.value,
      allowDots: allowDots.value,
      arrayFormat: arrayFormat.value,
    });
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
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

// ─── Example specs dropdown ───────────────────────────────────────────────────

const showExamplesMenu = ref(false);
const isLoadingSpec = ref(false);

async function loadExampleSpec(url: string) {
  showExamplesMenu.value = false;
  isLoadingSpec.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    specInput.value = await res.text();
  } catch (err: unknown) {
    errorMessage.value = `Failed to load spec: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    isLoadingSpec.value = false;
  }
}

function closeExamplesMenu(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.pg-examples-wrap')) {
    showExamplesMenu.value = false;
  }
}

// ─── Sticky settings detection ────────────────────────────────────────────────

const settingsSentinel = ref<HTMLElement | null>(null);
const isSticky = ref(false);
let stickyObserver: IntersectionObserver | null = null;

onMounted(async () => {
  // Sticky detection: observe a zero-height sentinel placed just above .pg-settings.
  // When it scrolls out of view the settings bar has become sticky.
  if (typeof IntersectionObserver !== 'undefined' && settingsSentinel.value) {
    stickyObserver = new IntersectionObserver(
      ([entry]) => {
        isSticky.value = !entry.isIntersecting;
      },
      { threshold: 0, rootMargin: `-${getNavHeight()}px 0px 0px 0px` }
    );
    stickyObserver.observe(settingsSentinel.value);
  }

  document.addEventListener('click', closeExamplesMenu);

  specInput.value = EXAMPLE_SPEC;
  await generate();
});

onUnmounted(() => {
  stickyObserver?.disconnect();
  document.removeEventListener('click', closeExamplesMenu);
});

function getNavHeight(): number {
  if (typeof document === 'undefined') return 64;
  const nav = document.querySelector('.VPNav') as HTMLElement | null;
  return nav ? nav.offsetHeight : 64;
}
</script>

<template>
  <div class="playground">
    <!-- Zero-height sentinel — when it leaves viewport the settings bar is sticky -->
    <div ref="settingsSentinel" class="pg-sentinel" aria-hidden="true" />

    <!-- ── Settings box ─────────────────────────────────────────── -->
    <div class="pg-settings" :class="{ 'pg-settings--stuck': isSticky }">
      <!-- Primary row -->
      <div class="pg-settings-row">
        <label class="pg-field">
          <span class="pg-label">
            Template
            <HintIcon :hint="HINTS.template" />
          </span>
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
            <ChevronDownIcon />
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">
            Mode
            <HintIcon :hint="HINTS.generationMode" />
          </span>
          <div class="pg-select-wrap">
            <select v-model="generationMode" class="pg-select">
              <option value="full">full</option>
              <option value="schemas">schemas</option>
            </select>
            <ChevronDownIcon />
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">
            Schema style
            <HintIcon :hint="HINTS.schemaStyle" />
          </span>
          <div class="pg-select-wrap">
            <select v-model="schemaStyle" class="pg-select">
              <option value="interface">interface</option>
              <option value="type">type</option>
            </select>
            <ChevronDownIcon />
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">
            Enum style
            <HintIcon :hint="HINTS.enumStyle" />
          </span>
          <div class="pg-select-wrap">
            <select v-model="enumStyle" class="pg-select">
              <option value="union">union</option>
              <option value="enum">enum</option>
            </select>
            <ChevronDownIcon />
          </div>
        </label>

        <label class="pg-field">
          <span class="pg-label">
            Nullable
            <HintIcon :hint="HINTS.nullableStrategy" />
          </span>
          <div class="pg-select-wrap">
            <select v-model="nullableStrategy" class="pg-select">
              <option value="ignore">ignore</option>
              <option value="include">include</option>
              <option value="nullableAsOptional">nullableAsOptional</option>
            </select>
            <ChevronDownIcon />
          </div>
        </label>

        <label class="pg-field pg-field--wide">
          <span class="pg-label">
            Base URL
            <HintIcon :hint="HINTS.baseUrl" />
          </span>
          <input
            v-model="baseUrl"
            type="text"
            placeholder="https://api.example.com"
            class="pg-input"
          />
        </label>

        <label class="pg-field pg-field--checkbox">
          <span class="pg-label">
            Skip deprecated
            <HintIcon :hint="HINTS.skipDeprecated" />
          </span>
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

        <!-- Push buttons to the right -->
        <div class="pg-spacer" />

        <Button
          variant="ghost"
          :chevron="true"
          :open="showAdvanced"
          :aria-expanded="showAdvanced"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? 'Less' : 'More' }}
        </Button>

        <Button style="min-width: 94px" :loading="isLoading" @click="generate"> Generate </Button>
      </div>

      <!-- Advanced row (collapsible) -->
      <Transition name="pg-expand">
        <div v-if="showAdvanced" class="pg-settings-row pg-settings-row--advanced">
          <label class="pg-field">
            <span class="pg-label">
              Date format
              <HintIcon :hint="HINTS.dateFormat" />
            </span>
            <div class="pg-select-wrap">
              <select v-model="dateFormat" class="pg-select">
                <option value="Date">Date</option>
                <option value="string">string</option>
              </select>
              <ChevronDownIcon />
            </div>
          </label>

          <label class="pg-field">
            <span class="pg-label">
              Array format
              <HintIcon :hint="HINTS.arrayFormat" />
            </span>
            <div class="pg-select-wrap">
              <select v-model="arrayFormat" class="pg-select">
                <option value="repeat">repeat</option>
                <option value="brackets">brackets</option>
                <option value="indices">indices</option>
              </select>
              <ChevronDownIcon />
            </div>
          </label>

          <label class="pg-field pg-field--wide">
            <span class="pg-label">
              Service prefix
              <HintIcon :hint="HINTS.servicePrefix" />
            </span>
            <input
              v-model="servicePrefix"
              type="text"
              placeholder="e.g. Petstore"
              class="pg-input"
            />
          </label>

          <label class="pg-field pg-field--checkbox">
            <span class="pg-label">
              Allow dots
              <HintIcon :hint="HINTS.allowDots" />
            </span>
            <div class="pg-checkbox-wrap">
              <input v-model="allowDots" type="checkbox" class="pg-checkbox" id="allowDots" />
              <label for="allowDots" class="pg-toggle" />
            </div>
          </label>

          <label class="pg-field pg-field--checkbox">
            <span class="pg-label">
              Prefer any
              <HintIcon :hint="HINTS.preferAny" />
            </span>
            <div class="pg-checkbox-wrap">
              <input v-model="preferAny" type="checkbox" class="pg-checkbox" id="preferAny" />
              <label for="preferAny" class="pg-toggle" />
            </div>
          </label>

          <div class="pg-spacer" />
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
          <div class="pg-examples-wrap">
            <button
              class="pg-examples-btn"
              :class="{ 'pg-examples-btn--loading': isLoadingSpec }"
              type="button"
              @click.stop="showExamplesMenu = !showExamplesMenu"
            >
              <span v-if="isLoadingSpec" class="pg-spinner pg-spinner--sm" aria-hidden="true" />
              <span v-else>Examples</span>

              <ChevronDownIcon
                v-if="!isLoadingSpec"
                :open="showExamplesMenu"
                style="width: 10px; height: 10px; position: static"
              />
            </button>
            <div v-if="showExamplesMenu" class="pg-examples-menu" role="menu">
              <button
                v-for="spec in EXAMPLE_SPECS"
                :key="spec.url"
                class="pg-examples-item"
                type="button"
                role="menuitem"
                @click="loadExampleSpec(spec.url)"
              >
                {{ spec.label }}
              </button>
            </div>
          </div>
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

/* ── Sticky sentinel ─────────────────────────────────────────────── */

.pg-sentinel {
  height: 0;
  /* Must sit at the very top of the scroll area so we detect stickiness correctly */
  margin-top: -1px;
}

/* ── Settings box ────────────────────────────────────────────────── */

.pg-settings {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: sticky;
  top: var(--vp-nav-height);
  z-index: 10;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  transition:
    border-radius 0.15s,
    margin 0.15s;
}

/* When stuck: flush with viewport edges & square top corners */
.pg-settings--stuck {
  border-radius: 0;
  border-top: none;
  /* Break out of the playground's horizontal padding */
  margin-left: -24px;
  margin-right: -24px;
  /* Restore inner padding so content doesn't touch the edges */
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 768px) {
  .pg-settings--stuck {
    margin-left: -12px;
    margin-right: -12px;
  }
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

/* ── Label ───────────────────────────────────────────────────────── */

.pg-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  user-select: none;
}

/* ── Custom select (with chevron) ────────────────────────────────── */

.pg-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pg-select {
  appearance: none;
  -webkit-appearance: none;
  height: 34px;
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

.pg-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

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

.pg-toggle::after {
  content: '';
  display: block;
  width: 14px;
  height: 14px;
  margin: 3px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
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

/* ── Expand / collapse transition ────────────────────────────────── */

.pg-expand-enter-active,
.pg-expand-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease,
    padding 0.25s ease;
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
  /*max-height: calc(100vh - 264px);*/
  max-height: calc(100vh - 185px);
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

/* ── Examples dropdown ───────────────────────────────────────────── */

.pg-examples-wrap {
  position: relative;
}

.pg-examples-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
}

.pg-examples-btn:hover,
.pg-examples-btn--loading {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pg-examples-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 230px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 50;
}

.pg-examples-item {
  display: block;
  width: 100%;
  padding: 9px 14px;
  background: transparent;
  border: none;
  color: var(--vp-c-text-1);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}

.pg-examples-item:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

.pg-examples-item + .pg-examples-item {
  border-top: 1px solid var(--vp-c-divider);
}

/* Small spinner for spec loading (base + size/colour override) */
.pg-spinner {
  display: inline-block;
  border-radius: 50%;
  border: 1.5px solid transparent;
  animation: pg-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes pg-spin {
  to {
    transform: rotate(360deg);
  }
}

.pg-spinner--sm {
  width: 11px;
  height: 11px;
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: var(--vp-c-brand-1);
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
  /* Use the light theme colors by default */
  background-color: var(--shiki-light-bg) !important;
  color: var(--shiki-light) !important;
}

.pg-highlighted :deep(pre.shiki code) {
  font-family: var(--vp-font-family-mono);
}

/* Token colors for light mode */
.pg-highlighted :deep(pre.shiki span) {
  color: var(--shiki-light) !important;
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

.pg-skeleton--short {
  width: 40%;
}
.pg-skeleton--medium {
  width: 65%;
}
.pg-skeleton--long {
  width: 90%;
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
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
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
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

<!-- Unscoped: .dark lives on <html>, so it cannot be targeted from a scoped block -->
<style>
.dark .pg-highlighted pre.shiki {
  background-color: var(--shiki-dark-bg) !important;
  color: var(--shiki-dark) !important;
}

.dark .pg-highlighted pre.shiki span {
  color: var(--shiki-dark) !important;
}
</style>
