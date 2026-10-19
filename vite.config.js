
import { defineConfig } from 'vite';
export default defineConfig({plugins:[auraInlineCss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  }
});


function auraInlineCss() {
  return {
    name: 'aura-inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' ||
            !asset.fileName.endsWith('.html')) continue;

        asset.source = String(asset.source).replace(
          /<link\b[^>]*>/g,
          tag => {
            if (!/rel=["']stylesheet["']/.test(tag)) return tag;
            const match = tag.match(/href=["']([^"']+)["']/);
            if (!match) return tag;
            const name = match[1].replace(/^\//, '');
            const css = bundle[name];
            if (!css || css.type !== 'asset') return tag;
            return '<style>' +
              String(css.source).replace(/<\/style/gi, '<\\/style') +
              '</style>';
          }
        );
      }
    }
  };
}
