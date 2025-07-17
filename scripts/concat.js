import { execSync } from 'child_process';
import fs from 'fs';

fs.writeFileSync('list.txt',
`file 'assets/intro.mp4'
file 'body.mp4'
file 'assets/cv.mp4'
`);

execSync(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy final.mp4`);
