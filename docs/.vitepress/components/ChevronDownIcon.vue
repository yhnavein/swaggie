<script setup lang="ts">
defineProps<{
  /** When true, rotates the icon 180° to indicate an open/expanded state */
  open?: boolean;
}>();
</script>

<template>
  <svg
    class="pg-chevron"
    :class="{ 'pg-chevron--open': open }"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    v-bind="$attrs"
  >
    <path
      d="M2 4l4 4 4-4"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.pg-chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
}

.pg-chevron--open {
  transform: rotate(180deg);
}
</style>
