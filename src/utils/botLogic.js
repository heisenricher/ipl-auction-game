import { BOT_STRATEGIES } from './constants';

export const getBotValuation = (player, teamName, roomPlayers, participants) => {
  const strategy = BOT_STRATEGIES[teamName] || { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78 };
  
  // 1. Initial Assessment based on Player Quality
  let baseValuation = player.base_price;
  if (player.rating >= 90) baseValuation += (player.rating - 80) * 0.9;
  else if (player.rating >= 80) baseValuation += (player.rating - 75) * 0.6;
  else baseValuation += (player.rating - 70) * 0.3;

  // Apply Strategy Baseline
  if (strategy.type === 'AGGRESSIVE' && player.rating >= 88) baseValuation *= 1.3;
  else if (strategy.type === 'BARGAIN') baseValuation *= 0.65;
  else if (strategy.type === 'VALUE' && player.role === 'All-Rounder') baseValuation *= 1.1;
  else baseValuation *= strategy.maxBidMultiplier;

  // 2. Dynamic Squad Need Algorithm
  if (roomPlayers && participants) {
    const squad = roomPlayers.filter(p => p.sold_to === teamName);
    const teamRecord = participants.find(p => p.team_name === teamName);
    const teamBudget = teamRecord?.budget || 0;
    
    const roleCount = squad.filter(p => p.role === player.role).length;
    const overseasCount = squad.filter(p => p.country !== 'India').length;
    
    // Check constraints: Can't buy if overseas limit reached or squad full
    if (player.country !== 'India' && overseasCount >= 8) return 0;
    if (squad.length >= 25) return 0;

    // Remaining slots to fill minimum requirement of 18 players (save 0.20 Cr per slot)
    const remainingSlotsToMin = Math.max(0, 18 - squad.length);
    const maxPossibleBid = teamBudget - (remainingSlotsToMin * 0.20); 
    if (maxPossibleBid < player.base_price) return 0;

    // Target counts for a "perfect squad"
    const targets = {
      'Batsman': 6,
      'Bowler': 6,
      'All-Rounder': 4,
      'Wicketkeeper': 2
    };

    // Urgency factor
    let urgency = 1.0;
    
    // Desperation: If they have 0 of a role and squad is getting full
    if (roleCount === 0 && squad.length > 10) {
      urgency = 1.8;
    }
    // High Need: If they need this role to hit target
    else if (roleCount < targets[player.role]) {
      urgency = 1.0 + ((targets[player.role] - roleCount) * 0.15); // e.g., need 2 WK, have 0 -> 1.3x
    }
    // Low Need: If they already have exactly enough
    else if (roleCount === targets[player.role]) {
      urgency = 0.4; // Don't bid high on excess
    }
    // Hard Limit: Stop bidding if they have too many of a role (e.g. 8 batters when target is 6)
    else if (roleCount > targets[player.role]) {
      return 0; // Hard pass, save money for other roles
    }
    
    // Superstar Override: Always try for top players if budget allows
    if (player.rating >= 90 && teamBudget > 40 && roleCount <= targets[player.role] + 1) {
      urgency = Math.max(urgency, 1.4);
    }

    baseValuation *= urgency;

    // 2.5. Franchise Bias (Category 4 Expansion)
    if (teamName === 'CSK' && player.rating >= 85) {
      baseValuation *= 1.15; // CSK pays premium for experience/quality
    } else if (teamName === 'RR' && player.rating < 85 && player.base_price <= 0.5) {
      baseValuation *= 1.2; // RR overbids slightly on uncapped/cheap youth
    } else if (teamName === 'MI' && player.rating >= 90) {
      baseValuation *= 1.25; // MI aggressively pursues superstars
    } else if (teamName === 'PBKS') {
      // PBKS unpredictability (Panic buying)
      if (squad.length < 5 && teamBudget > 80) baseValuation *= 1.3;
    }

    // 3. Unpredictable Modifiers (Bluffing & Panicking)
    const randomSeed = Math.random();
    
    if (randomSeed > 0.95 && teamBudget > 20) {
      // 5% chance to bluff (bid higher than intended on a player to drive up price)
      baseValuation *= 1.3;
    } else if (randomSeed < 0.10 && player.rating < 85) {
      // 10% chance to drop out early on an average player (mimics hesitation)
      baseValuation *= 0.5;
    } else {
      // Normal +/- 10% variance for realistic bid amounts
      baseValuation *= (0.90 + (Math.random() * 0.20));
    }

    // Hard budget cap
    if (baseValuation > maxPossibleBid) {
      baseValuation = maxPossibleBid;
    }
  }
  
  // Formatting and minimum price checks
  if (baseValuation > 0 && baseValuation < player.base_price) {
    // 50% chance they just bid base price if they kinda want them
    if (Math.random() > 0.5) baseValuation = player.base_price;
    else baseValuation = 0;
  }
  
  return Number(baseValuation.toFixed(2));
};

export const evaluateTradeOffer = (offeredPlayer, requestedPlayer, botTeamName, roomPlayers) => {
  const botSquad = roomPlayers.filter(p => p.sold_to === botTeamName);
  
  // Contextual Needs Target
  const targets = { 'Batsman': 6, 'Bowler': 6, 'All-Rounder': 4, 'Wicketkeeper': 2 };
  
  const botRoleCounts = {
    'Batsman': botSquad.filter(p => p.role === 'Batsman').length,
    'Bowler': botSquad.filter(p => p.role === 'Bowler').length,
    'All-Rounder': botSquad.filter(p => p.role === 'All-Rounder').length,
    'Wicketkeeper': botSquad.filter(p => p.role === 'Wicketkeeper').length
  };
  
  // Calculate impact of losing requested and gaining offered
  const currentNeedOfferedRole = Math.max(0, targets[offeredPlayer.role] - botRoleCounts[offeredPlayer.role]); 
  const currentNeedRequestedRole = Math.max(0, targets[requestedPlayer.role] - botRoleCounts[requestedPlayer.role]);

  // Rule 1: Always accept if offered player is a superstar (90+) and requested is NOT a superstar.
  if (offeredPlayer.rating >= 90 && requestedPlayer.rating < 90) {
    return { accepted: true, reason: `We can't pass up a superstar like ${offeredPlayer.name}! Deal.` };
  }

  // Rule 2: If bot desperately needs the offered player's role, and has a surplus of the requested player's role
  if (currentNeedOfferedRole > currentNeedRequestedRole && offeredPlayer.rating >= requestedPlayer.rating - 5) {
    return { accepted: true, reason: `We really needed a ${offeredPlayer.role}, and we have plenty of ${requestedPlayer.role}s. Good trade.` };
  }

  // Rule 3: Base Rating comparison (Strict fallback)
  if (offeredPlayer.rating >= requestedPlayer.rating + 2) {
    return { accepted: true, reason: `Statistically, ${offeredPlayer.name} is an upgrade for our squad. We accept.` };
  }
  
  // Rejection Logic
  if (botRoleCounts[requestedPlayer.role] <= (targets[requestedPlayer.role] - 1)) {
    return { accepted: false, reason: `We cannot trade ${requestedPlayer.name}, we are too short on ${requestedPlayer.role}s!` };
  }

  return { accepted: false, reason: `We prefer keeping ${requestedPlayer.name}. This trade doesn't improve our overall depth or rating.` };
};
