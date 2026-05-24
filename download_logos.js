import fs from 'fs';
import path from 'path';
import https from 'https';

const LOGO_DIR = path.join(process.cwd(), 'public', 'logos');

// Create directory if it doesn't exist
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const FRANCHISE_LOGOS = [
  { id: 'CSK', url: 'https://upload.wikimedia.org/wikipedia/en/2/2b/Chennai_Super_Kings_Logo.svg' },
  { id: 'MI', url: 'https://upload.wikimedia.org/wikipedia/en/c/cd/Mumbai_Indians_Logo.svg' },
  { id: 'RCB', url: 'https://upload.wikimedia.org/wikipedia/en/5/52/Royal_Challengers_Bengaluru_Logo.svg' },
  { id: 'KKR', url: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Kolkata_Knight_Riders_Logo.svg' },
  { id: 'RR', url: 'https://upload.wikimedia.org/wikipedia/en/5/5c/Rajasthan_Royals_Logo.svg' },
  { id: 'SRH', url: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Sunrisers_Hyderabad.svg' },
  { id: 'DC', url: 'https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals.svg' },
  { id: 'LSG', url: 'https://upload.wikimedia.org/wikipedia/en/a/a3/Lucknow_Super_Giants_Logo.svg' },
  { id: 'GT', url: 'https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg' },
  { id: 'PBKS', url: 'https://upload.wikimedia.org/wikipedia/en/d/d4/Punjab_Kings_Logo.svg' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const main = async () => {
  console.log('Downloading logos with delay to prevent rate limits...');
  for (const franchise of FRANCHISE_LOGOS) {
    const ext = path.extname(franchise.url);
    const dest = path.join(LOGO_DIR, `${franchise.id.toLowerCase()}${ext}`);
    
    // Check if file already exists so we don't redownload it
    if (fs.existsSync(dest)) {
      console.log(`${franchise.id} logo already exists locally, skipping...`);
      continue;
    }

    console.log(`Waiting 2.5 seconds before downloading ${franchise.id} logo...`);
    await sleep(2500);

    console.log(`Downloading ${franchise.id} logo to ${dest}...`);
    try {
      await downloadFile(franchise.url, dest);
      console.log(`Successfully downloaded ${franchise.id} logo.`);
    } catch (error) {
      console.error(`Failed to download ${franchise.id} logo:`, error.message);
    }
  }
  console.log('Finished downloading all logos!');
};

main();
