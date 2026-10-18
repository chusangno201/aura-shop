import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { priceOrder } from '../server/products.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (status, data) => res.status(status).json(data);

  if (!['GET', 'POST'].includes(req.method)) {
    return reply(405, {error: 'Phương thức không hỗ trợ.'});
  }

  if (req.method === 'GET') {
    const key = process.env.ADMIN_KEY || '';
    const supplied = String(req.headers.authorization || '')
      .replace(/^Bearer /, '');
    const a = Buffer.from(key), b = Buffer.from(supplied);

    if (key.length < 24) {
      return reply(503, {
        error: 'Chưa cấu hình ADMIN_KEY trên Vercel.'
      });
    }
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return reply(401, {error: 'Mật khẩu quản trị không đúng.'});
    }
  }

  const url = process.env.AURA_SHEETS_URL || '';
  const token = process.env.AURA_SHEETS_TOKEN;

  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)
      || !token) {
    return reply(503, {
      error: 'Chưa cấu hình kết nối Google Sheet trên Vercel.'
    });
  }

  async function sheets(data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...data, token}),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw Error();

    const result = await response.json();
    if (!result.ok && !result.conflict) throw Error();
    return result;
  }

  try {
    if (req.method === 'GET') {
      const result = await sheets({action: 'list'});
      return reply(200, result.orders);
    }

    if (req.headers.origin) {
      let valid = false;
      try {
        const u = new URL(req.headers.origin);
        const allowed = (
          process.env.ALLOWED_ORIGINS ||
          'https://auralamour.vn,https://www.auralamour.vn,http://localhost:5173,http://127.0.0.1:5173'
        ).split(',').map(s => s.trim());

        valid = u.host === req.headers.host || allowed.includes(u.origin);
      } catch {}

      if (!valid) {
        return reply(403, {error: 'Nguồn yêu cầu không hợp lệ.'});
      }
    }

    const requestKey = req.headers['idempotency-key'];
    if (typeof requestKey !== 'string' ||
        !/^[\w-]{16,80}$/.test(requestKey)) {
      return reply(400, {error: 'Thiếu mã yêu cầu đặt hàng.'});
    }

    const customer = {};
    let priced;

    try {
      if (Buffer.byteLength(JSON.stringify(req.body ?? '')) > 16000) {
        throw Error();
      }

      const input = typeof req.body === 'string'
        ? JSON.parse(req.body) : req.body;

      for (const field of ['name', 'phone', 'address', 'note']) {
        customer[field] = String(input?.customer?.[field] || '').trim();
      }

      if (customer.name.length < 2 || customer.name.length > 100 ||
          !/^(0|\+84)\d{9}$/.test(customer.phone) ||
          customer.address.length < 10 ||
          customer.address.length > 500 ||
          customer.note.length > 500) {
        throw Error();
      }

      priced = priceOrder(input.items);
    } catch {
      return reply(400, {
        error: 'Kiểm tra sản phẩm, số lượng và thông tin nhận hàng.'
      });
    }

    const order = {
      id: 'AURA-' + randomUUID(),
      ...priced,
      customer,
      status: 'pending_cod',
      createdAt: new Date().toISOString()
    };

    const fingerprint = createHash('sha256')
      .update(JSON.stringify({customer, ...priced}))
      .digest('hex');

    const result = await sheets({
      action: 'create', requestKey, fingerprint, order
    });

    if (result.conflict) {
      return reply(409, {
        error: 'Mã yêu cầu đã dùng cho đơn khác. Hãy bắt đầu đặt đơn mới.'
      });
    }

    const saved = result.order;
    return reply(result.duplicate ? 200 : 201, {
      id: saved.id,
      total: saved.total,
      shipping: saved.shipping
    });
  } catch {
    return reply(503, {
      error: 'Không kết nối được Google Sheet. Kiểm tra Web App và thử lại.'
    });
  }
}
