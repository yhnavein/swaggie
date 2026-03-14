<template>
  <span class="pg-hint-wrap" :data-hint="hint">
    <svg
      class="pg-hint-icon"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Help"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
      <path
        d="M7.2 9.6V9.2c0-.8.4-1.4 1-1.8.5-.3.8-.7.8-1.2 0-.7-.5-1.2-1.2-1.2-.6 0-1.1.4-1.2 1H5.4c.1-1.3 1.1-2.2 2.4-2.2 1.4 0 2.4.9 2.4 2.2 0 .8-.4 1.5-1.1 1.9-.4.3-.7.7-.7 1.1v.4H7.2zm-.1 1.6a.9.9 0 1 1 1.8 0 .9.9 0 0 1-1.8 0z"
        fill="currentColor"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
defineProps<{ hint: string }>();
</script>

<style scoped>
.pg-hint-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.pg-hint-icon {
  width: 13px;
  height: 13px;
  color: var(--vp-c-text-3);
  cursor: default;
  flex-shrink: 0;
  transition: color 0.15s;
}

.pg-hint-wrap:hover .pg-hint-icon {
  color: var(--vp-c-brand-1);
}

/* Tooltip bubble */
.pg-hint-wrap::after {
  content: attr(data-hint);
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  padding: 7px 10px;
  border-radius: 6px;
  background: var(--vp-c-bg-elv, #2a2a2a);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  font-size: 11.5px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
  text-transform: none;
  white-space: normal;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 100;
}

/* Tooltip arrow */
.pg-hint-wrap::before {
  content: '';
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: var(--vp-c-divider);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 101;
}

.pg-hint-wrap:hover::after,
.pg-hint-wrap:hover::before {
  opacity: 1;
}
</style>
