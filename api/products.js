import { products } from '../server/products.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Phương thức không hỗ trợ.'
    });
  }

  return res.status(200).json(products);
}
