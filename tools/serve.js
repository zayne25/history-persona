/**
 * 零依赖静态服务器
 * 用法：node tools/serve.js [端口]
 * 说明：只监听 127.0.0.1，不对外暴露；用于本地预览与调试分享链接。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2]) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch (e) {
    res.writeHead(400).end('bad request');
    return;
  }

  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // 防目录穿越：解析后必须仍在 ROOT 之内
  const target = path.resolve(ROOT, '.' + urlPath);
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        .end('<meta charset="utf-8"><h1>404</h1><p>此卷已残 —— 找不到 ' + urlPath + '</p><p><a href="/">回到首页</a></p>');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('  你在历史中的名字 · 本地预览');
  console.log('  http://127.0.0.1:' + PORT + '/');
  console.log('  按 Ctrl+C 停止');
});
