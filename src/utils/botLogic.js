import { BOT_STRATEGIES } from './constants';

export const getBotValuation = (player, teamName, roomPlayers, participants) => {
  const strategy = BOT_STRATEGIES[teamName] || { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78 };
  const ratingFactor = Math.max(0, (player.rating - 75)) * 0.75;
  let baseValuation = player.base_price + ratingFactor;

  if (strategy.type === 'AGGRESSIVE' && player.rating >= 92) baseValuation *= 1.15;
  else if (strategy.type === 'BARGAIN') baseValuation *= 0.70;
  else if (strategy.type === 'VALUE' && player.role === 'All-Rounder') baseValuation *= 1.05;
  else baseValuation *= strategy.maxBidMultiplier;

  // SQUAD AWARENESS & DESPERATION
  if (roomPlayers && participants) {
    const squad = roomPlayers.filter(p => p.sold_to === teamName);
    const roleCount = squad.filter(p => p.role === player.role).length;
    const teamBudget = participants.find(p => p.team_name === teamName)?.budget || 0;

    if (squad.length < 15 && teamBudget > 60) baseValuation *= 1.25; // Desperation
    
    if (player.role === 'Wicketkeeper' && roleCount === 0) baseValuation *= 1.6;
    if (player.role === 'Wicketkeeper' && roleCount >= 2) baseValuation *= 0.1;
    if (player.role === 'Batsman' && roleCount >= 6) baseValuation *= 0.3;
    if (player.role === 'Bowler' && roleCount >= 6) baseValuation *= 0.3;

    // Unpredictability factor (+/- 15%)
    const rng = (Math.random() * 0.3) + 0.85;
    baseValuation *= rng;
  }
  
  return Number(baseValuation.toFixed(2));
};
