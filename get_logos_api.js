import fs from 'fs';
import path from 'path';
import https from 'https';

const LOGO_DIR = path.join(process.cwd(), 'public', 'logos');

if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const TEAMS = [
  { id: 'CSK', title: 'File:Chennai_Super_Kings_Logo.svg' },
  { id: 'MI', title: 'File:Mumbai_Indians_Logo.svg' },
  { id: 'RCB', title: 'File:Royal_Challengers_Bengaluru_Logo.svg' },
  { id: 'KKR', title: 'File:Kolkata_Knight_Riders_Logo.svg' },
  { id: 'RR', title: 'File:This is the logo for Rajasthan Royals, a cricket team playing in the Indian Premier League (IPL).svg' },
  { id: 'SRH', title: 'File:Sunrisers_Hyderabad_Logo.svg' },
  { id: 'DC', title: 'File:Delhi_Capitals.svg' },
  { id: 'LSG', title: 'File:Lucknow_Super_Giants_Logo.svg' },
  { id: 'GT', title: 'File:Gujarat_Titans_Logo.svg' },
  { id: 'PBKS', title: 'File:Punjab_Kings_Logo.svg' }
];

const getWikiDirectUrl = (title) => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'IPL-Mega-Auction-Game-Logo-Downloader/1.0 (contact: test@example.com)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const url = pages[pageId]?.imageinfo?.[0]?.url;
            if (url) {
              resolve(url);
              return;
            }
          }
          reject(new Error(`Could not parse image URL for ${title}`));
        } catch (e) {
          reject(e);
        }
      });
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
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: Status ${res.statusCode}`));
        return;
      }
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
  console.log('Resolving and downloading official team logos from Wikipedia API...');
  for (const team of TEAMS) {
    const dest = path.join(LOGO_DIR, `${team.id.toLowerCase()}.svg`);
    
    console.log(`Resolving ${team.id} (${team.title})...`);
    try {
      await sleep(1500); // 1.5s delay
      const imageUrl = await getWikiDirectUrl(team.title);
      console.log(`Resolved direct URL for ${team.id}: ${imageUrl}`);
      console.log(`Downloading...`);
      await sleep(1000);
      await downloadFile(imageUrl, dest);
      console.log(`Saved ${team.id} logo successfully.`);
    } catch (err) {
      console.error(`Error processing ${team.id}:`, err.message);
      
      // Fallback check for DC if Delhi_Capitals.svg fails
      if (team.id === 'DC' && team.title === 'File:Delhi_Capitals.svg') {
        console.log('Retrying DC with alternate title Delhi_Capitals_Logo.svg...');
        try {
          const altUrl = await getWikiDirectUrl('File:Delhi_Capitals_Logo.svg');
          await downloadFile(altUrl, dest);
          console.log(`Saved DC logo successfully via alternate title.`);
        } catch (altErr) {
          console.error(`DC retry failed:`, altErr.message);
        }
      }
    }
  }
  console.log('Done!');
};

main();
