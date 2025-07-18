import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 1️⃣ 記事本文を取得
 *   ‑ 今はダミー文字列を返すが、RSS / JSON API などへ置き換え可能
 */
async function fetchArticle () {
  return `ＡＩがデザインを変える日は今日かもしれない。\n生成ＡＩの導入で、チームの役割分担と学習サイクルがどう変わるか──`;
}

/**
 * 2️⃣ GPT‑4o に 60 秒ショート用の台本生成を依頼
 *   - 250〜350 字、論理重視、冒頭 10 秒で問題提起… など詳細プロンプト
 *   - 戻り値は「タイトル:\n...\n\nスクリプト:\n...」形式のプレーンテキスト
 */
async function summarize (articleText) {
  const prompt = `あなたはYouTube Shorts用の構成作家です。\\n\\n
    以下の記事をもとに、**1分以内で伝える要約スクリプト**を作成してください。\\n
    内容は感情的な演出ではなく、**チーム運営や育成に関わる実践的な気づき**を整理してください。\\n\\n
    【制約】\\n- 
    冒頭10秒で要点がわかるようにする（問題提起や前提を簡潔に）\\n- 
    残りの40〜50秒で、記事の「本質・問い・示唆」を構造的に要約\\n- 
    感情表現は最小限でよい。論理的でわかりやすく\\n- 
    文体はカジュアル寄り（かたい解説口調はNG）\\n- 
    1文ごとに改行し、ショートのナレーションとして自然なテンポに\\n- 
    60秒で読み切れる量（250〜350字程度）\\n\\n
    【出力形式】\\n
    タイトル:\n（ショート動画タイトルとして使える短く端的な見出しを30文字以内）\\n\\n
    スクリプト:\n（1文ごとに改行された要約スクリプト）\\n\\n
    ハッシュタグ:\n（1〜2 個を末尾に付与。検索流入を強化する）
    `;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: articleText }
    ],
    max_tokens: 400,
    temperature: 0.7
  });

  return res.choices[0].message.content.trim();
}

/**
 * 3️⃣ Puppeteer で 1080×1920 の HTML テンプレを開き、字幕を描画してキャプチャ
 *    GitHub Actions の Linux ランナーでは `--no-sandbox` が必須
 */
async function captureFrames (scriptText) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920 }
  });

  const page = await browser.newPage();
  const url = 'file://' + path.resolve('template/body.html') + '#' + encodeURIComponent(scriptText);
  await page.goto(url);
  // 表示完了まで文字数 ×40ms + 500ms ほど待機
  await page.waitForTimeout(scriptText.length * 40 + 500);
  await page.screenshot({ path: 'frame.png', fullPage: true });
  await browser.close();
}

/**
 * 4️⃣ 画像 1 枚を 10 秒ループで MP4 化
 */
function makeBodyMp4 () {
  execSync('ffmpeg -y -loop 1 -i frame.png -t 10 -c:v libx264 -pix_fmt yuv420p body.mp4');
}

// ---------------- main ----------------
(async () => {
  try {
    const article = await fetchArticle();
    const script = await summarize(article);
    await captureFrames(script);
    makeBodyMp4();
    console.log('✅ body.mp4 generated');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
