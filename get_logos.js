import fs from 'fs';
import path from 'path';
import https from 'https';

const LOGO_DIR = path.join(process.cwd(), 'public', 'logos');

if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const TEAMS = [
  { id: 'CSK', wikiPage: 'https://en.wikipedia.org/wiki/File:Chennai_Super_Kings_Logo.svg' },
  { id: 'MI', wikiPage: 'https://en.wikipedia.org/wiki/File:Mumbai_Indians_Logo.svg' },
  { id: 'RCB', wikiPage: 'https://en.wikipedia.org/wiki/File:Royal_Challengers_Bengaluru_Logo.svg' },
  { id: 'KKR', wikiPage: 'https://en.wikipedia.org/wiki/File:Kolkata_Knight_Riders_Logo.svg' },
  { id: 'RR', wikiPage: 'https://en.wikipedia.org/wiki/File:Rajasthan_Royals_Logo.svg' },
  { id: 'SRH', wikiPage: 'https://en.wikipedia.org/wiki/File:Sunrisers_Hyderabad.svg' },
  { id: 'DC', wikiPage: 'https://en.wikipedia.org/wiki/File:Delhi_Capitals.svg' },
  { id: 'LSG', wikiPage: 'https://en.wikipedia.org/wiki/File:Lucknow_Super_Giants_Logo.svg' },
  { id: 'GT', wikiPage: 'https://en.wikipedia.org/wiki/File:Gujarat_Titans_Logo.svg' },
  { id: 'PBKS', wikiPage: 'https://en.wikipedia.org/wiki/File:Punjab_Kings_Logo.svg' }
];

const fetchHtml = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const main = async () => {
  console.log('Resolving and downloading logos from Wikipedia...');
  for (const team of TEAMS) {
    const dest = path.join(LOGO_DIR, `${team.id.toLowerCase()}.svg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`${team.id} logo already exists and is non-empty, skipping.`);
      continue;
    }

    console.log(`Fetching page ${team.wikiPage}...`);
    try {
      await sleep(2000); // 2s rate limit helper
      const html = await fetchHtml(team.wikiPage);
      
      // Parse for full image link: href="//upload.wikimedia.org/wikipedia/en/.../Team_Logo.svg"
      const match = html.match(/href="(\/\/upload\.wikimedia\.org\/wikipedia\/en\/[^"]+\.svg)"/);
      if (match && match[1]) {
        const imageUrl = 'https:' + match[1];
        console.log(`Found direct URL for ${team.id}: ${imageUrl}`);
        console.log(`Downloading ${team.id} logo...`);
        await sleep(1000);
        await downloadFile(imageUrl, dest);
        console.log(`Successfully saved ${team.id} logo.`);
      } else {
        console.error(`Could not find direct URL in page HTML for ${team.id}`);
      }
    } catch (err) {
      console.error(`Error processing ${team.id}:`, err.message);
    }
  }
  console.log('Finished processing all logos!');
};

main();
