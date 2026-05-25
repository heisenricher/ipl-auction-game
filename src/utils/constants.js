// IPL Franchise List
export const FRANCHISES = [
  { id: 'CSK', name: 'Chennai Super Kings', color: '#F7D117', text: '#1e1b4b' },
  { id: 'MI', name: 'Mumbai Indians', color: '#004BA0', text: '#ffffff' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24', text: '#ffffff' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: '#3A225D', text: '#ffffff' },
  { id: 'RR', name: 'Rajasthan Royals', color: '#EA1B85', text: '#ffffff' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: '#F26522', text: '#ffffff' },
  { id: 'DC', name: 'Delhi Capitals', color: '#1B3E8F', text: '#ffffff' },
  { id: 'LSG', name: 'Lucknow Super Giants', color: '#00A9E0', text: '#0f172a' },
  { id: 'GT', name: 'Gujarat Titans', color: '#0B2240', text: '#ffffff' },
  { id: 'PBKS', name: 'Punjab Kings', color: '#D71920', text: '#ffffff' }
];

// ─────────────────────────────────────────────────────────────────
//  BOT PERSONALITY ENGINE — Deeply Randomized Per-Session
// ─────────────────────────────────────────────────────────────────
//
//  Each franchise gets a "DNA" profile randomized at session start:
//    - archetype:     Core bidding philosophy
//    - aggression:    How far beyond fair value they will push (0.5 – 1.8)
//    - patience:      How long they wait before entering bidding wars (0 – 1)
//    - riskTolerance: Willingness to overpay when desperate (0 – 1)
//    - loyaltyBias:   Bonus for Indian/overseas players (per franchise flavor)
//    - starHunger:    Multiplier for 90+ rated players (0.8 – 2.0)
//    - youthFocus:    Multiplier for cheap, young (<85 rating) players
//    - panicThreshold:Remaining squad count at which bot enters panic mode
//    - bluffChance:   Probability of bluff bidding to drain rivals
//    - budgetPacing:  What % of budget to ideally spend before set N
//
//  The DNA has a fixed "franchise flavor" range + a random component
//  so every session plays differently.
// ─────────────────────────────────────────────────────────────────

const r = (min, max) => min + Math.random() * (max - min);  // random float in range
const ri = (min, max) => Math.floor(r(min, max + 1));       // random int in range

// Pre-build ideal squad composition templates (randomized per session!)
const buildSquadPlan = (flavor) => {
  // Flavor options: 'bat-heavy', 'bowl-heavy', 'balanced', 'ar-heavy'
  switch (flavor) {
    case 'bat-heavy':
      return { Batsman: ri(6, 8), Bowler: ri(5, 6), 'All-Rounder': ri(3, 4), Wicketkeeper: ri(2, 3) };
    case 'bowl-heavy':
      return { Batsman: ri(5, 6), Bowler: ri(6, 8), 'All-Rounder': ri(3, 5), Wicketkeeper: ri(2, 2) };
    case 'ar-heavy':
      return { Batsman: ri(5, 6), Bowler: ri(5, 6), 'All-Rounder': ri(4, 6), Wicketkeeper: ri(2, 3) };
    default: // balanced
      return { Batsman: ri(5, 7), Bowler: ri(5, 7), 'All-Rounder': ri(3, 5), Wicketkeeper: ri(2, 3) };
  }
};

// Pick a random squad composition flavor for each franchise
const pickFlavor = () => ['bat-heavy', 'bowl-heavy', 'balanced', 'ar-heavy'][ri(0, 3)];

// Generate a fresh BOT_STRATEGIES map each time the module loads (session-unique)
const generateStrategies = () => {
  return {
    CSK: {
      archetype: 'VALUE',
      label: 'The Strategist',
      tagline: 'Experience wins trophies',
      aggression: r(0.85, 1.05),
      patience: r(0.6, 0.9),
      riskTolerance: r(0.3, 0.6),
      starHunger: r(1.1, 1.4),
      youthFocus: r(0.5, 0.7),
      indianBias: r(1.05, 1.20),     // CSK historically values Indian stars
      overseasBias: r(0.85, 1.0),
      panicThreshold: ri(12, 16),
      bluffChance: r(0.02, 0.06),
      budgetPacing: { early: r(0.35, 0.50), mid: r(0.55, 0.70), late: r(0.80, 0.95) },
      squadPlan: buildSquadPlan(Math.random() > 0.6 ? 'bat-heavy' : 'balanced'),
      maxOverseas: ri(6, 8),
      preferredRoles: ['Batsman', 'All-Rounder'],
      avoidRoles: [],
    },
    MI: {
      archetype: 'AGGRESSIVE',
      label: 'The Conqueror',
      tagline: 'Buy the best, build around them',
      aggression: r(1.1, 1.5),
      patience: r(0.2, 0.5),
      riskTolerance: r(0.6, 0.9),
      starHunger: r(1.4, 2.0),       // MI goes all-in on superstars
      youthFocus: r(0.4, 0.6),
      indianBias: r(0.95, 1.1),
      overseasBias: r(1.0, 1.2),
      panicThreshold: ri(10, 14),
      bluffChance: r(0.03, 0.08),
      budgetPacing: { early: r(0.45, 0.65), mid: r(0.60, 0.80), late: r(0.85, 1.0) },
      squadPlan: buildSquadPlan(pickFlavor()),
      maxOverseas: ri(6, 8),
      preferredRoles: ['Bowler', 'All-Rounder'],
      avoidRoles: [],
    },
    RCB: {
      archetype: 'STAR_COLLECTOR',
      label: 'The Showman',
      tagline: 'We buy the headline, sort the squad later',
      aggression: r(1.15, 1.6),
      patience: r(0.1, 0.4),
      riskTolerance: r(0.7, 1.0),
      starHunger: r(1.5, 2.0),       // RCB notorious for overpaying for stars
      youthFocus: r(0.3, 0.5),
      indianBias: r(1.0, 1.15),
      overseasBias: r(1.05, 1.25),    // RCB loves overseas stars
      panicThreshold: ri(8, 13),
      bluffChance: r(0.01, 0.04),
      budgetPacing: { early: r(0.50, 0.70), mid: r(0.65, 0.85), late: r(0.90, 1.0) },
      squadPlan: buildSquadPlan(Math.random() > 0.5 ? 'bat-heavy' : 'balanced'),
      maxOverseas: ri(6, 8),
      preferredRoles: ['Batsman'],
      avoidRoles: [],
    },
    KKR: {
      archetype: 'ANALYTICAL',
      label: 'The Analyst',
      tagline: 'Data doesn\'t lie',
      aggression: r(0.8, 1.1),
      patience: r(0.5, 0.8),
      riskTolerance: r(0.4, 0.7),
      starHunger: r(0.9, 1.3),
      youthFocus: r(0.9, 1.3),       // KKR invests in young talent
      indianBias: r(0.95, 1.1),
      overseasBias: r(1.0, 1.15),
      panicThreshold: ri(11, 15),
      bluffChance: r(0.04, 0.10),     // KKR bluffs more to drain rivals
      budgetPacing: { early: r(0.30, 0.45), mid: r(0.50, 0.65), late: r(0.75, 0.90) },
      squadPlan: buildSquadPlan(pickFlavor()),
      maxOverseas: ri(5, 7),
      preferredRoles: ['All-Rounder', 'Bowler'],
      avoidRoles: [],
    },
    RR: {
      archetype: 'MONEYBALL',
      label: 'The Scientist',
      tagline: 'Value over vanity, every single time',
      aggression: r(0.6, 0.85),
      patience: r(0.7, 1.0),         // RR extremely patient
      riskTolerance: r(0.2, 0.5),
      starHunger: r(0.6, 0.9),       // RR rarely chases superstars
      youthFocus: r(1.2, 1.7),       // RR loves uncapped bargains
      indianBias: r(0.9, 1.05),
      overseasBias: r(1.05, 1.2),
      panicThreshold: ri(13, 17),
      bluffChance: r(0.01, 0.03),
      budgetPacing: { early: r(0.20, 0.35), mid: r(0.40, 0.55), late: r(0.65, 0.85) },
      squadPlan: buildSquadPlan(Math.random() > 0.4 ? 'ar-heavy' : 'balanced'),
      maxOverseas: ri(5, 7),
      preferredRoles: ['All-Rounder'],
      avoidRoles: [],
    },
    SRH: {
      archetype: 'BOWLING_FIRST',
      label: 'The Fortress',
      tagline: 'Bowlers win championships',
      aggression: r(0.8, 1.15),
      patience: r(0.4, 0.7),
      riskTolerance: r(0.4, 0.7),
      starHunger: r(1.0, 1.4),
      youthFocus: r(0.7, 1.0),
      indianBias: r(0.95, 1.1),
      overseasBias: r(1.0, 1.2),      // SRH loves overseas pacers
      panicThreshold: ri(11, 15),
      bluffChance: r(0.02, 0.06),
      budgetPacing: { early: r(0.30, 0.50), mid: r(0.50, 0.70), late: r(0.75, 0.90) },
      squadPlan: buildSquadPlan(Math.random() > 0.3 ? 'bowl-heavy' : 'balanced'),
      maxOverseas: ri(6, 8),
      preferredRoles: ['Bowler'],
      avoidRoles: [],
    },
    DC: {
      archetype: 'WILDCARD',
      label: 'The Gambler',
      tagline: 'Fortune favors the bold... sometimes',
      aggression: r(0.7, 1.4),        // Very high variance!
      patience: r(0.2, 0.8),
      riskTolerance: r(0.5, 1.0),
      starHunger: r(0.8, 1.6),
      youthFocus: r(0.6, 1.2),
      indianBias: r(0.9, 1.15),
      overseasBias: r(0.9, 1.15),
      panicThreshold: ri(9, 16),
      bluffChance: r(0.05, 0.12),     // DC bluffs a lot
      budgetPacing: { early: r(0.25, 0.55), mid: r(0.45, 0.75), late: r(0.70, 0.95) },
      squadPlan: buildSquadPlan(pickFlavor()),
      maxOverseas: ri(5, 8),
      preferredRoles: ['Batsman', 'Bowler'],
      avoidRoles: [],
    },
    LSG: {
      archetype: 'METHODICAL',
      label: 'The Engineer',
      tagline: 'Build brick by brick',
      aggression: r(0.75, 1.05),
      patience: r(0.5, 0.85),
      riskTolerance: r(0.3, 0.6),
      starHunger: r(0.9, 1.2),
      youthFocus: r(0.8, 1.1),
      indianBias: r(1.0, 1.15),
      overseasBias: r(0.9, 1.1),
      panicThreshold: ri(12, 16),
      bluffChance: r(0.02, 0.05),
      budgetPacing: { early: r(0.25, 0.40), mid: r(0.45, 0.60), late: r(0.70, 0.88) },
      squadPlan: buildSquadPlan(Math.random() > 0.5 ? 'balanced' : 'ar-heavy'),
      maxOverseas: ri(5, 7),
      preferredRoles: ['All-Rounder', 'Wicketkeeper'],
      avoidRoles: [],
    },
    GT: {
      archetype: 'UNDERDOG',
      label: 'The Dark Horse',
      tagline: 'Quiet confidence, loud results',
      aggression: r(0.8, 1.2),
      patience: r(0.4, 0.75),
      riskTolerance: r(0.4, 0.8),
      starHunger: r(0.9, 1.3),
      youthFocus: r(0.9, 1.3),
      indianBias: r(1.0, 1.2),        // GT prefers Indian talent
      overseasBias: r(0.85, 1.05),
      panicThreshold: ri(11, 15),
      bluffChance: r(0.03, 0.08),
      budgetPacing: { early: r(0.30, 0.45), mid: r(0.50, 0.65), late: r(0.75, 0.92) },
      squadPlan: buildSquadPlan(pickFlavor()),
      maxOverseas: ri(5, 7),
      preferredRoles: ['Bowler', 'All-Rounder'],
      avoidRoles: [],
    },
    PBKS: {
      archetype: 'CHAOTIC',
      label: 'The Maverick',
      tagline: 'We don\'t follow patterns, we break them',
      aggression: r(0.9, 1.7),        // PBKS is the most volatile
      patience: r(0.1, 0.5),
      riskTolerance: r(0.7, 1.0),
      starHunger: r(1.0, 1.8),
      youthFocus: r(0.5, 1.4),        // Random: sometimes youth, sometimes star
      indianBias: r(0.85, 1.15),
      overseasBias: r(0.85, 1.25),
      panicThreshold: ri(7, 14),       // Panics earlier or later — unpredictable
      bluffChance: r(0.05, 0.15),      // Highest bluff rate
      budgetPacing: { early: r(0.35, 0.65), mid: r(0.50, 0.80), late: r(0.75, 1.0) },
      squadPlan: buildSquadPlan(pickFlavor()),
      maxOverseas: ri(5, 8),
      preferredRoles: [],              // PBKS doesn't have a preference — chaos
      avoidRoles: [],
    },
  };
};

// Generate once per page load / session (every auction is different!)
export const BOT_STRATEGIES = generateStrategies();

// Allow re-rolling strategies for a new session
export const rerollBotStrategies = () => {
  const newStrategies = generateStrategies();
  Object.keys(newStrategies).forEach(key => {
    BOT_STRATEGIES[key] = newStrategies[key];
  });
  return BOT_STRATEGIES;
};
