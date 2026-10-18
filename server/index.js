
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { products } from './products.js';
import orders from '../api/orders.js';

const port = Number(process.env.PORT) || 3001;
const root = resolve('dist');

http.createServer(async (req, res) => {
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = data => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
    return res;
  };
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  try {
    const path = new URL(req.url, 'http://localhost').pathname;

    if (path === '/api/products' && req.method === 'GET') {
      return res.json(products);
    }

    if (path === '/api/orders') {
      if (req.method === 'POST') {
        const chunks = [];
        let size = 0;

        for await (const chunk of req) {
          size += chunk.length;
          if (size > 16000) {
            return res.status(413).json({error:'Dữ liệu quá lớn.'});
          }
          chunks.push(chunk);
        }

        try {
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          return res.status(400).json({error:'Dữ liệu không hợp lệ.'});
        }
      }
      return await orders(req, res);
    }

    if (path.startsWith('/api/')) {
      return res.status(404).json({error:'Không tìm thấy API.'});
    }

    if (!['GET','HEAD'].includes(req.method)) {
      return res.status(405).json({error:'Phương thức không hỗ trợ.'});
    }

    let file = resolve(root, '.' + decodeURIComponent(path));

    if (file !== root && !file.startsWith(root + sep)) {
      return res.status(403).json({error:'Đường dẫn không hợp lệ.'});
    }

    if (file === root || !extname(file)) {
      file = resolve(root, 'index.html');
    }

    if (!existsSync(file) || !statSync(file).isFile()) {
      return res.status(404).json({
        error:'Chạy npm run build hoặc dùng cổng 5173 khi phát triển.'
      });
    }

    const types = {
      '.html':'text/html; charset=utf-8',
      '.js':'text/javascript; charset=utf-8',
      '.css':'text/css; charset=utf-8',
      '.jpg':'image/jpeg',
      '.png':'image/png',
      '.svg':'image/svg+xml',
      '.webp':'image/webp',
      '.ico':'image/x-icon'
    };

    res.setHeader('Content-Type',
      types[extname(file)] || 'application/octet-stream');
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
  } catch {
    if (!res.headersSent) {
      res.status(500).json({error:'Máy chủ gặp lỗi. Vui lòng thử lại.'});
    } else res.end();
  }
}).listen(port, () => {
  console.log('AURA Google Sheet server: http://localhost:' + port);
});
