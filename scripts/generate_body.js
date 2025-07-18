import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------ 1. 記事取得（ダミー） ------------ */
async function fetchArticle () {
  return '生成AI導入でチーム運営がどう変わるか──最新の実践例を紹介';
}

/* ------------ 2. 60 秒要約スクリプト生成 ------------ */
async function summarize (text) {
  const prompt = `あなたはYouTube Shorts用の構成作家です。以下の記事を参考に\n・冒頭10秒で要点、残りで示唆\n・250〜350字\n・改行区切り\n・タイトル30字以内\n・末尾にハッシュタグ2個\nで出力してください。`;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ],
    max_tokens: 300
  });
  return res.choices[0].message.content.trim();
}

/* ------------ 3. CSS スクロールを 30fps で PNG キャプチャ ------------ */
async function captureFrames (script) {
  await fs.rm('frames', { recursive: true, force: true });
  await fs.mkdir('frames', { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920 }
  });

  const page = await browser.newPage();
  const url = 'file://' + path.resolve('template/body.html') + '#' + encodeURIComponent(script);
  await page.goto(url, { waitUntil: 'networkidle0' });

  for (let i = 0; i < 1620; i++) {          // 54 s × 30 fps
    const fn = `frames/frame-${String(i).padStart(3, '0')}.png`;
    await page.screenshot({ path: fn });
    // Node.js 標準の setTimeout で 33 ms 待つ
    await new Promise((res) => setTimeout(res, 33));
  }
  await browser.close();
}

/* ------------ 4. PNG を body.mp4 に変換 ------------ */
function makeBodyMp4 () {
  execSync(
    `ffmpeg -y -framerate 30 -i frames/frame-%03d.png ` +
    `-c:v libx264 -pix_fmt yuv420p -t 10 body.mp4`,
    { stdio: 'inherit' }
  );
}

/* ------------ 5. メイン ------------ */
(async () => {
  const article = await fetchArticle();
  const script  = article;
  await captureFrames(script);
  makeBodyMp4(54);
  console.log('✅ body.mp4 generated');
})();
