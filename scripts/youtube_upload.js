import axios from 'axios';
import fs from 'fs';

const {
  YT_ACCESS_TOKEN,
  VIDEO_TITLE = 'カルチャーハックメディア｜今日のネタ',
  VIDEO_DESC = '#AI #Design'
} = process.env;

async function upload() {
  // 1. resumable session start
  const { headers } = await axios.post(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&shorts=true',
    {
      snippet: { title: VIDEO_TITLE, description: VIDEO_DESC },
      status : { privacyStatus: 'public' }
    },
    {
      headers: {
        'Authorization': `Bearer ${YT_ACCESS_TOKEN}`,
        'Content-Type' : 'application/json'
      }
    }
  );
  const location = headers.location;

  // 2. PUT binary
  await axios.put(location, fs.readFileSync('final.mp4'), {
    headers: { 'Content-Type': 'video/*' }
  });
  console.log('✅ uploaded');
}

upload();
