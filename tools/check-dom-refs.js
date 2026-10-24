/**
 * 静态校验：页面脚本里引用的 DOM id，必须在对应 HTML 中存在
 * 用法：node tools/check-dom-refs.js
 * 目的：避免「JS 找得到元素、HTML 里却没有」这类只在运行时才暴露的低级错误。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'assets/js/pages');
const htmlDir = root;

const pages = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.js'));
let problems = 0;

pages.forEach((file) => {
  const page = path.basename(file, '.js');
  const htmlPath = path.join(htmlDir, (page === 'home' ? 'index' : page) + '.html');
  if (!fs.existsSync(htmlPath)) {
    console.log(`[跳过] ${page}.js 没有对应的 HTML（可能是纯逻辑模块）`);
    return;
  }
  const js = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const refs = new Set();
  const patterns = [/\bel\(\s*'([^']+)'\s*\)/g, /getElementById\(\s*'([^']+)'\s*\)/g];
  patterns.forEach((re) => {
    let m;
    while ((m = re.exec(js))) refs.add(m[1]);
  });

  const existing = new Set();
  const idRe = /id="([^"]+)"/g;
  let mm;
  while ((mm = idRe.exec(html))) existing.add(mm[1]);

  // JS 自身动态生成的节点，不要求在静态 HTML 中存在
  const dynamic = new Set();
  let dm;
  while ((dm = idRe.exec(js))) dynamic.add(dm[1]);

  refs.forEach((id) => {
    if (dynamic.has(id)) return;
    if (!existing.has(id)) {
      problems += 1;
      console.log(`[缺失] ${page}.html 中找不到 id="${id}"（被 ${page}.js 引用）`);
    }
  });
  console.log(`  ${page}.js 共引用 ${refs.size} 个 id，已核对`);
});

console.log(problems === 0 ? '\nDOM 引用校验通过' : `\nDOM 引用校验发现 ${problems} 处问题`);
process.exit(problems === 0 ? 0 : 1);
