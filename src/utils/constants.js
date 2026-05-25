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

// BOT Bidding Personalities & Strategies
export const BOT_STRATEGIES = {
  RCB: { type: 'AGGRESSIVE', maxBidMultiplier: 1.15, minRating: 88, name: 'Aggressive Superstar Hunter' },
  MI: { type: 'AGGRESSIVE', maxBidMultiplier: 1.15, minRating: 88, name: 'Aggressive Superstar Hunter' },
  CSK: { type: 'VALUE', maxBidMultiplier: 0.95, minRating: 82, name: 'Balanced Value Seeker' },
  KKR: { type: 'YOUTH', maxBidMultiplier: 1.10, minRating: 85, name: 'Youth & Potential Focus' },
  RR: { type: 'BARGAIN', maxBidMultiplier: 0.85, minRating: 80, name: 'Moneyball Bargain Hunter' },
  SRH: { type: 'BALANCED', maxBidMultiplier: 1.00, minRating: 84, name: 'Balanced Pragmatist' },
  DC: { type: 'BALANCED', maxBidMultiplier: 1.00, minRating: 84, name: 'Balanced Pragmatist' },
  LSG: { type: 'BALANCED', maxBidMultiplier: 1.00, minRating: 84, name: 'Balanced Pragmatist' },
  GT: { type: 'BALANCED', maxBidMultiplier: 1.00, minRating: 84, name: 'Balanced Pragmatist' },
  PBKS: { type: 'AGGRESSIVE', maxBidMultiplier: 1.20, minRating: 85, name: 'Unpredictable High Bidder' }
};
