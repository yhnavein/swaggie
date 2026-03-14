<script setup lang="ts">
import ChevronDownIcon from './ChevronDownIcon.vue';

withDefaults(
  defineProps<{
    /** Visual style of the button */
    variant?: 'default' | 'ghost';
    /** Disables the button and reduces opacity */
    disabled?: boolean;
    /** Shows a spinner and hides the default slot content */
    loading?: boolean;
    /** Renders a chevron icon that rotates when `open` is true */
    chevron?: boolean;
    /** Rotates the chevron to the open (180°) position */
    open?: boolean;
    /** Native button type */
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'default',
    disabled: false,
    loading: false,
    chevron: false,
    open: false,
    type: 'button',
  }
);
</script>

<template>
  <button
    class="pg-btn"
    :class="[`pg-btn--${variant}`, { 'pg-btn--loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
    v-bind="$attrs"
  >
    <!-- Spinner (shown while loading) -->
    <span v-if="loading" class="pg-btn-spinner" aria-hidden="true" />

    <!-- Default slot content (hidden while loading) -->
    <span v-if="!loading" class="pg-btn-content">
      <slot />
    </span>

    <!-- Optional chevron icon -->
    <ChevronDownIcon v-if="chevron && !loading" :open="open" />
  </button>
</template>

<style scoped>
.pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 18px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    opacity 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.pg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Variant: default (brand) ────────────────────────────────────── */

.pg-btn--default {
  background: var(--vp-c-brand-2);
  color: var(--vp-c-white);
}

.pg-btn--default:hover:not(:disabled) {
  background: var(--vp-c-brand-3);
}

/* ── Variant: ghost ──────────────────────────────────────────────── */

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

/* ── Spinner ─────────────────────────────────────────────────────── */

.pg-btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: pg-btn-spin 0.7s linear infinite;
  flex-shrink: 0;
}

/* Ghost spinner uses brand colour since it sits on a light background */
.pg-btn--ghost .pg-btn-spinner {
  border-color: rgba(0, 0, 0, 0.12);
  border-top-color: var(--vp-c-brand-1);
}

@keyframes pg-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

</style>
