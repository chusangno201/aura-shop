
import fs from 'node:fs/promises';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {build,createServer} from 'vite';

await build();

const server = await createServer({
  configFile:false,
  optimizeDeps:{noDiscovery:true,include:[]},
  server:{middlewareMode:true},
  appType:'custom'
});

try {
  const {App} = await server.ssrLoadModule('/src/main.jsx');
  const markup = renderToString(React.createElement(App));
  const file = 'dist/index.html';
  const html = await fs.readFile(file,'utf8');
  const root = /<div\s+id=["']root["']\s*>\s*<\/div>/;
  if (!root.test(html)) throw Error('Không tìm thấy root rỗng.');
  await fs.writeFile(
    file,
    html.replace(root, () => '<div id="root">' + markup + '</div>')
  );
  console.log('Prerender hoàn tất.');
} finally {
  await server.close();
}
