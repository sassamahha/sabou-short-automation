import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';          // OpenAI 依存は完全に除去

/* ---------- 1. 記事取得 ---------- */
async function fetchArticle () {
  // TODO: RSS や API で取得する本番処理に置き換える
  return `
生成AI導入でチーム運営がどう変わるか──最新の実践例を紹介

まず、AIはクリエイティブプロセスの一部を自動化してくれる。
これでスタッフはより重要な戦略的な仕事に集中できるんだ。

AIがアイデアを出し初期案を作ることが当たり前に。
それを基に人間のデザイナーがブラッシュアップする流れが主流に。

さらに、スタッフの学び方も変わる。
AIのアウトプットを理解し、適切にフィードバックするスキルが重要。
`.trim();
}

/* ---------- 2. Puppeteer でフレーム連番 ---------- */
async function captureFrames (text, duration = 36) {      // ← 36s (1/3 速度)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920 }
  });
  const page = await browser.newPage();

  // 本文を URL ハッシュで渡す
  const url = 'file://' + path.resolve('template/body.html') + '#' +
              encodeURIComponent(text);
  await page.goto(url);

  await fs.rm('frames', { recursive: true, force: true });
  await fs.mkdir('frames');

  const totalFrames = duration * 30;   // 30fps
  for (let i = 0; i < totalFrames; i++) {
    const p = `frames/frame-${String(i).padStart(4,'0')}.png`;
    await page.screenshot({ path: p });
    await new Promise(r => setTimeout(r, 33));  // 30 fps
  }
  await browser.close();
}

/* ---------- 3. mp4 化 ---------- */
function makeBodyMp4 (duration = 36) {
  execSync(
    `ffmpeg -y -framerate 30 -i frames/frame-%04d.png -c:v libx264 ` +
    `-pix_fmt yuv420p -t ${duration} assets/body.mp4`,
    { stdio: 'inherit' }
  );
}

/* ---------- 4. main ---------- */
(async () => {
  const article = await fetchArticle();        // 要約なし・全文
  const D = 36;
  await captureFrames(article, D);
  makeBodyMp4(D);
})();
