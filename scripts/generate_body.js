import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 1️⃣ 記事本文を取得（ダミー）
 *    本番は RSS / REST API などで差し替え
 */
async function fetchArticle () {
  return `ＡＩがデザインを変える日は今日かもしれない。\n生成ＡＩ導入で、チーム学習サイクルがどう変わるか──`;
}

/**
 * 2️⃣ GPT‑4o で 60 秒スクリプトを生成
 */
async function summarize (text) {
  const systemMsg = `あなたはYouTube Shorts用の構成作家です。\n以下の記事をもとに、1分以内で伝える要約スクリプトを作成してください。\n内容は感情的な演出ではなく、チーム運営や育成に関わる実践的な気づきを整理してください。\n\n【制約】\n- 冒頭10秒で要点がわかるようにする\n- 残り40〜50秒で記事の「本質・問い・示唆」を構造的に要約\n- 感情表現は最小限でよい\n- 文体はカジュアル寄り（かたい解説口調はNG）\n- 1文ごとに改行しナレーションとして自然なテンポ\n- 60秒で読み切れる量（250〜350字程度）\n- タイトルは30字以内、末尾にハッシュタグを1〜2個\n\n【出力形式】\nタイトル:\nスクリプト:`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: text }
    ],
    max_tokens: 400,
    temperature: 0.7
  });

  return res.choices[0].message.content.trim();
}

/**
 * 3️⃣ Puppeteer で 1080×1920 PNG を 1 枚キャプチャ
 */
async function captureFrame (script) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920 }
  });
  const page = await browser.newPage();
  const url = 'file://' + path.resolve('template/body.html') + '#' + encodeURIComponent(script);
  await page.goto(url);
  // Puppeteer v22 では page.waitForTimeout が削除されたため setTimeout で待機
  const ms = Math.min(script.length * 40 + 800, 15000); // 最大 15 秒
  await new Promise(res => setTimeout(res, ms));
  await page.screenshot({ path: 'frame.png', fullPage: true });
  await browser.close();
}

/**
 * 4️⃣ PNG → 10 秒 mp4 にエンコード
 */
function makeBodyMp4 () {
  execSync('ffmpeg -y -loop 1 -i frame.png -t 10 -c:v libx264 -pix_fmt yuv420p body.mp4');
}

(async () => {
  const article = await fetchArticle();
  const summary = await summarize(article);
  await captureFrame(summary);
  makeBodyMp4();
})();
