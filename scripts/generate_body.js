// scripts/generate_body.js
// -----------------------------------------------------------
// 生成 AI 記事を 70〜90字に要約 → 1080×1920 PNG → body.mp4 を作る
// -----------------------------------------------------------

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* 1. 記事を取得（ここではダミー文字列） */
async function fetchArticle () {
  return `ＡＩがデザインを変える日は今日かもしれない。\n生成ＡＩ導入で、チームの役割分担と学習サイクルはどう変わるのか──`;
}

/* 2. 60 秒ショート用スクリプトを作成 */
async function summarize (text) {
  const prompt = `
あなたはYouTube Shorts用の構成作家です。

以下の記事をもとに、**1分以内で伝える要約スクリプト**を作成してください。
内容は感情的な演出ではなく、**チーム運営や育成に関わる実践的な気づき**を整理してください。

【制約】
- 冒頭10秒で、要点がわかるようにする（問題提起や前提を簡潔に）
- 残りの40〜50秒で、記事の「本質・問い・示唆」を構造的に要約
- 感情表現は最小限でよい。論理的でわかりやすく
- 文体はカジュアル寄り（かたい解説口調はNG）
- 1文ごとに改行し、ショートのナレーションとして自然なテンポに
- 60秒で読み切れる量（250〜350字程度）
- タイトルは30字以内、ハッシュタグを2つ末尾に

【出力形式】
タイトル:
（ショート動画タイトルとして使える短く端的な見出し）

スクリプト:
（1文ごとに改行された要約スクリプト）
`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.trim() },
      { role: 'user', content: text }
    ],
    max_tokens: 300
  });

  return res.choices[0].message.content.trim();
}

/* 3. Puppeteer で 1080×1920 キャプチャ（fullPage OFF = 1920px 高さ固定） */
async function captureFrame (script) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920 }
  });

  const page = await browser.newPage();
  const url =
    'file://' + path.resolve('template/body.html') + '#' + encodeURIComponent(script);
  await page.goto(url, { waitUntil: 'networkidle0' });

  // テキストをすべてタイプアウトするまで待機（40ms × 文字数）
  const ms = script.length * 40 + 500;
  await new Promise((r) => setTimeout(r, ms));

  await page.screenshot({ path: 'frame.png' }); // ← fullPage フラグなし
  await browser.close();
}

/* 4. PNG → 10 秒ループ mp4 へ */
function makeBodyMp4 () {
  execSync(
    `ffmpeg -y -loop 1 -i frame.png -t 10 -c:v libx264 -pix_fmt yuv420p body.mp4`,
    { stdio: 'inherit' }
  );
}

/* 5. メインフロー */
(async () => {
  const article = await fetchArticle();
  const summary = await summarize(article);

  await captureFrame(summary);
  makeBodyMp4();

  console.log('✅ body.mp4 generated');
})();
