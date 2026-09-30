import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Inline the built CSS into index.html. Some phones failed to load the separate stylesheet request
// and showed an unstyled app; with the styles inside the page there is no second request to fail.
function inlineCss() {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html) return;
      for (const [file, asset] of Object.entries(bundle)) {
        if (!file.endsWith('.css')) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*?${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>`);
        if (!tag.test(html.source)) continue;
        html.source = html.source.replace(tag, () => `<style>${asset.source}</style>`);
        delete bundle[file];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCss()],
});
