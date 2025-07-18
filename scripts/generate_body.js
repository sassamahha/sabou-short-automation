import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ① もと記事を取得（ダミー） */
async function fetchArticle () {
  return '生成AI導入でチーム運営がどう変わるか──最新の実践例を紹介';
}

/* ② 70〜90字・タイトル＋ハッシュタグ付きスクリプトを生成 */
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
    model:'gpt-4o',
    messages:[
      { role:'system', content:prompt.trim() },
      { role:'user', content:text }
    ],
    max_tokens:300
  });
  return res.choices[0].message.content.trim();
}

/* ③ CSS アニメを実時間で録画：30fps × 10s = 300枚 PNG */
async function captureFrames (script) {
  await fs.rm('frames',{ recursive:true, force:true });
  await fs.mkdir('frames', { recursive:true });

  const browser = await puppeteer.launch({
    headless:'new',
    args:['--no-sandbox','--disable-setuid-sandbox'],
    defaultViewport:{ width:1080, height:1920 }
  });

  const page = await browser.newPage();
  const url = 'file://'+path.resolve('template/body.html')+'#'+encodeURIComponent(script);
  await page.goto(url,{ waitUntil:'networkidle0' });

  for(let i=0;i<300;i++){          // 0〜9.96 秒
    const p = `frames/frame-${String(i).padStart(3,'0')}.png`;
    await page.screenshot({ path:p });
    await page.waitForTimeout(33); // ≒30fps
  }
  await browser.close();
}

/* ④ PNG → body.mp4 */
function makeBodyMp4(){
  execSync(
    `ffmpeg -y -framerate 30 -i frames/frame-%03d.png `+
    `-c:v libx264 -pix_fmt yuv420p -t 10 body.mp4`,
    { stdio:'inherit' }
  );
}

/* ⑤ メイン */
(async()=>{
  const art   = await fetchArticle();
  const script= await summarize(art);
  await captureFrames(script);
  makeBodyMp4();
  console.log('✅ body.mp4 generated');
})();
