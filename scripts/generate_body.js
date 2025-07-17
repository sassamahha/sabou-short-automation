import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchArticle() {
  // ★RSS/API をここでフェッチして todayArticle に入れる★
  // 例としてダミー
  return 'ＡＩがデザインを変える日は今日かもしれない';
}

async function summarize(text) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'あなたは70〜90字にまとめる日本語編集者です' },
      { role: 'user', content: text }
    ],
    max_tokens: 120
  });
  return res.choices[0].message.content.trim();
}

async function captureFrames(summary) {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1080, height: 1920 }
  });
  const page = await browser.newPage();
  const url = 'file://' +
    path.resolve('template/body.html') + '#' +
    encodeURIComponent(summary);
  await page.goto(url);
  await page.waitForTimeout(summary.length * 40 + 500);
  await page.screenshot({ path: 'frame.png', fullPage: true });
  await browser.close();
  // 1枚で済ませる簡易版。動きを付けたい場合は連番ループで撮る
}

function makeBodyMp4() {
  execSync(`ffmpeg -y -loop 1 -i frame.png -t 10 -c:v libx264 -pix_fmt yuv420p body.mp4`);
}

(async () => {
  const art = await fetchArticle();
  const summary = await summarize(art);
  await captureFrames(summary);
  makeBodyMp4();
})();
