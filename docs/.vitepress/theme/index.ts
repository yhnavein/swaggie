import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client';
import Playground from '../components/Playground.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground);
    enhanceAppWithTabs(app);
  },
} satisfies Theme;
