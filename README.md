# IPL Mega Auction - Live Real-Time Bidding Game

Welcome to the **IPL Mega Auction Game**! This is a real-time multiplayer bidding game designed with a highly responsive, premium dark-themed interface, visual countdowns, synthesized sound effects, and robust database sync.

The game supports two modes:
1. **Local Sandbox Mode**: Single-player experience where you manage a franchise (e.g. CSK, MI, RCB) and compete against 9 smart AI CPU bots that bid based on player ratings, budgets, and realistic valuation calculations.
2. **Online Real-Time Multiplayer Mode**: Fully synchronized multiplayer using **Supabase** as a serverless realtime backend where friends can join using a Room Code, select their teams, and bid live.

---

## 🛠️ Tech Stack & Features

- **Frontend**: React (Vite), Lucide Icons, and Vanilla CSS with HSL design variables.
- **Backend Sync**: Supabase Realtime Channels (Database-driven state-sync with low latency).
- **Sound Effects**: Synthesized gavel knocks and chime tones via browser **Web Audio API** (no external audio files required!).
- **Confetti**: Interactive winning confetti using `canvas-confetti`.

---

## 🚀 Step-by-Step Setup Guide

### 1. Local Setup

First, navigate to the project directory and install the dependencies:

```bash
cd ipl-auction-game
npm install
```

Start the development server:

```bash
npm run dev
```

The game should now open automatically at `http://localhost:3000`. By default, if no Supabase credentials are found, the app will run in **Local Sandbox Mode** against AI bots. You can start playing immediately!

---

### 2. Configure Supabase (For Online Multiplayer)

To unlock the online multiplayer lobby:

1. **Create a Free Account**: Go to [Supabase](https://supabase.com/) and create a new project.
2. **Run the Database Setup**:
   - In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
   - Click **New Query**.
   - Copy the contents of the local file [supabase_setup.sql](file:///c:/Users/Srira/Desktop/Mahilan/2/ipl-auction-game/supabase_setup.sql) in this directory.
   - Paste it into the editor and click **Run**. This will create the required tables (`rooms`, `participants`, `room_players`, `bids_log`) and enable Realtime subscription rules.
3. **Get API Credentials**:
   - Go to **Project Settings** (gear icon) -> **API**.
   - Copy the **Project URL** and the **anon public API Key**.
4. **Set Up Local Env**:
   - Duplicate `.env.example` and rename it to `.env.local` inside the `ipl-auction-game` folder.
   - Paste your Project URL and Anon Key:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - Restart the local development server (`npm run dev`) to load the environment variables.

---

## ☁️ Deploying to Vercel

Hosting this game on Vercel is extremely easy because Vercel automatically builds and deploys static React-Vite frontends in seconds.

### Method A: Using Git & GitHub (Recommended)
1. Initialize Git in the project and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of IPL Auction Game"
   ```
2. Link your GitHub repository.
3. Import the repository in your [Vercel Dashboard](https://vercel.com).
4. **Important**: Under **Environment Variables** in Vercel, add:
   - `VITE_SUPABASE_URL` = (your Supabase project URL)
   - `VITE_SUPABASE_ANON_KEY` = (your Supabase anon key)
5. Click **Deploy**. Vercel will build the React-Vite project and provide a public deployment link!

### Method B: Vercel CLI
If you have Vercel CLI installed:
```bash
npm install -g vercel
vercel
```
Provide the environment variables during prompt configuration or in the Vercel dashboard.

---

## 🏆 Game Rules & Roster Constraints

- **Salary Cap**: Every franchise starts with a budget of **₹120.00 Crore**.
- **Squad Size**: Standard squads must consist of **18 to 25 players**.
- **Overseas Cap**: A maximum of **8 overseas players** are permitted in a single squad.
- **Bidding Intervals**: Bidding follows a progressive increase scheme matching official IPL rules:
  - Bids under **₹2.00 Crore**: Increases by **₹0.10 Crore** (10 Lakhs)
  - Bids between **₹2.00 Crore - ₹5.00 Crore**: Increases by **₹0.20 Crore** (20 Lakhs)
  - Bids between **₹5.00 Crore - ₹10.00 Crore**: Increases by **₹0.50 Crore** (50 Lakhs)
  - Bids above **₹10.00 Crore**: Increases by **₹1.00 Crore** (1 Crore)
- **Bid Extensions**: When a bid is placed, the timer extends by **10 seconds** to allow other players to respond.
- **Host Power**: The host has full authority to pause/resume the timer, skip players, or force-sell players when the timer hits zero.
- **Roster Evaluation**: At the end of the auction, all squads are evaluated based on their average player ratings. Teams violating squad size (e.g. having fewer than 18 players) or overseas limits (more than 8 overseas) will be marked as **Invalid Squads**.
