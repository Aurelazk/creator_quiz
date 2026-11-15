'use strict';

const QRCode = require('qrcode');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const text = url.searchParams.get('text') || '';
  if (!text || text.length > 500) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'text requis' }));
  }
  try {
    const buf = await QRCode.toBuffer(text, {
      type: 'png', width: 420, margin: 1,
      color: { dark: '#0C1A4B', light: '#FFFFFF' },
    });
    res.statusCode = 200;
    res.setHeader('content-type', 'image/png');
    res.setHeader('cache-control', 'public, max-age=300');
    return res.end(buf);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'QR indisponible' }));
  }
};
