import { BOT_STRATEGIES } from './constants';

// ─────────────────────────────────────────────────────────────────
//  EXTRAORDINARY BOT VALUATION ENGINE v3.0
// ─────────────────────────────────────────────────────────────────
//
//  Every bot has a unique DNA (from constants.js) that produces
//  wildly different auction behaviors per session. The algorithm:
//
//  1. MARKET VALUE — What is this player objectively worth based
//     on rating, role, nationality, and scarcity in the pool?
//
//  2. SQUAD FIT — How urgently does the bot need this role? Does
//     the bot's ideal squad plan demand this player or not?
//
//  3. FRANCHISE DNA — Apply unique personality multipliers
//     (aggression, star hunger, youth focus, nationality bias)
//
//  4. BUDGET INTELLIGENCE — Consider remaining budget vs remaining
//     players vs auction phase (early/mid/late) to pace spending.
//
//  5. RIVALRY & EMOTION — Emotional spikes (bidding wars, panic
//     buying, bluff bids) that make each auction chaotic and unique.
//
//  6. RANDOMIZATION LAYER — Final ±20% variance with rare spikes
//     (bluff, hesitation, "walk away moments") so no two auctions
//     ever produce the same result.
// ─────────────────────────────────────────────────────────────────

// Helper: Calculate how far through the auction we are (0.0 = start, 1.0 = end)
const getAuctionProgress = (roomPlayers) => {
  if (!roomPlayers || roomPlayers.length === 0) return 0;
  const total = roomPlayers.length;
  const sold = roomPlayers.filter(p => p.status === 'sold' || p.sold_to).length;
  const unsold = roomPlayers.filter(p => p.status === 'unsold').length;
  return (sold + unsold) / total;
};

// Helper: Count how many top-tier players remain in the pool
const countRemainingStars = (roomPlayers, minRating = 85) => {
  return roomPlayers.filter(p => 
    p.status === 'available' && !p.sold_to && p.rating >= minRating
  ).length;
};

// Helper: Count remaining players of a specific role in the pool
const countRemainingByRole = (roomPlayers, role) => {
  return roomPlayers.filter(p =>
    p.status === 'available' && !p.sold_to && p.role === role
  ).length;
};

// Helper: Calculate the "fair market value" of a player based on rating curve
const calculateMarketValue = (player) => {
  const rating = player.rating || 75;
  const base = player.base_price || player.basePrice || 0.20;
  
  // Non-linear value curve — superstars are exponentially more valuable
  let marketValue;
  if (rating >= 95) {
    marketValue = base + (rating - 80) * 1.2 + Math.pow((rating - 90), 1.8) * 0.3;
  } else if (rating >= 90) {
    marketValue = base + (rating - 80) * 1.0 + Math.pow((rating - 85), 1.5) * 0.2;
  } else if (rating >= 85) {
    marketValue = base + (rating - 75) * 0.7;
  } else if (rating >= 80) {
    marketValue = base + (rating - 72) * 0.45;
  } else if (rating >= 75) {
    marketValue = base + (rating - 70) * 0.25;
  } else {
    marketValue = base + Math.max(0, (rating - 68)) * 0.12;
  }

  return Math.max(base, marketValue);
};


// ─────────────────────────────────────────────────────────────────
//  MAIN EXPORT: getBotValuation
//  Returns: maximum bid amount the bot is willing to go to (in Cr)
//  Returns 0 if the bot has no interest in the player.
// ─────────────────────────────────────────────────────────────────
export const getBotValuation = (player, teamName, roomPlayers, participants) => {
  const dna = BOT_STRATEGIES[teamName] || BOT_STRATEGIES['DC']; // fallback to DC profile
  
  const squad = roomPlayers.filter(p => p.sold_to === teamName);
  const teamRecord = participants.find(p => p.team_name === teamName);
  const teamBudget = teamRecord?.budget || 0;
  const squadSize = squad.length;
  
  // ─── HARD CONSTRAINTS ──────────────────────────────────
  const overseasCount = squad.filter(p => p.country !== 'India').length;
  const isOverseas = player.country !== 'India';
  
  if (isOverseas && overseasCount >= (dna.maxOverseas || 8)) return 0;
  if (squadSize >= 25) return 0;
  
  // Reserve budget for remaining minimum squad slots
  const remainingSlotsToMin = Math.max(0, 18 - squadSize);
  const reservePerSlot = 0.20 + (getAuctionProgress(roomPlayers) * 0.10); // reserve increases late
  const maxPossibleBid = teamBudget - (remainingSlotsToMin * reservePerSlot);
  if (maxPossibleBid < (player.base_price || player.basePrice || 0.20)) return 0;

  // ─── STEP 1: MARKET VALUE ──────────────────────────────
  let valuation = calculateMarketValue(player);

  // ─── STEP 2: SQUAD FIT & URGENCY ──────────────────────
  const plan = dna.squadPlan || { Batsman: 6, Bowler: 6, 'All-Rounder': 4, Wicketkeeper: 2 };
  const roleCount = squad.filter(p => p.role === player.role).length;
  const roleTarget = plan[player.role] || 4;
  const roleDeficit = roleTarget - roleCount;
  const progress = getAuctionProgress(roomPlayers);

  let urgencyMultiplier = 1.0;

  if (roleDeficit > 0) {
    // We need this role
    urgencyMultiplier = 1.0 + (roleDeficit * 0.12);
    
    // Desperation escalation: getting full without filling this role
    if (roleCount === 0 && squadSize > (dna.panicThreshold || 12)) {
      urgencyMultiplier *= 1.6 + (Math.random() * 0.4); // 1.6x-2.0x panic
    }
    
    // Scarcity premium: few players of this role remain in pool
    const remainingOfRole = countRemainingByRole(roomPlayers, player.role);
    if (remainingOfRole <= roleDeficit) {
      urgencyMultiplier *= 1.3 + (Math.random() * 0.3); // Must-buy territory
    } else if (remainingOfRole <= roleDeficit + 2) {
      urgencyMultiplier *= 1.1 + (Math.random() * 0.15);
    }
  } else if (roleDeficit === 0) {
    // We have exactly enough — low interest unless they're elite
    urgencyMultiplier = player.rating >= 90 ? 0.6 : 0.25;
  } else {
    // We have too many of this role — hard pass unless extraordinary
    if (player.rating >= 92 && dna.starHunger > 1.3) {
      urgencyMultiplier = 0.4; // Only the most star-hungry bots consider it
    } else {
      return 0; // Don't waste budget
    }
  }

  // Preferred role bonus from franchise DNA
  if (dna.preferredRoles && dna.preferredRoles.includes(player.role)) {
    urgencyMultiplier *= 1.1 + (Math.random() * 0.1);
  }

  valuation *= urgencyMultiplier;

  // ─── STEP 3: FRANCHISE DNA PERSONALITY ─────────────────
  
  // 3a. Aggression baseline
  valuation *= dna.aggression;

  // 3b. Star hunger — superstars get premium pricing
  if (player.rating >= 90) {
    valuation *= dna.starHunger;
  } else if (player.rating >= 87) {
    valuation *= (1.0 + (dna.starHunger - 1.0) * 0.5); // Half the star boost for near-stars
  }

  // 3c. Youth focus — cheap, young players with growth potential
  if (player.rating < 82 && (player.base_price || player.basePrice) <= 0.50) {
    valuation *= dna.youthFocus;
  }

  // 3d. Nationality bias
  if (player.country === 'India') {
    valuation *= dna.indianBias;
  } else {
    valuation *= dna.overseasBias;
  }

  // ─── STEP 4: BUDGET INTELLIGENCE ──────────────────────
  //
  //  Bots should pace their spending. If they've already spent more
  //  than their budgetPacing target for this phase, they cool down.
  //  If they've underspent, they can afford to be aggressive.
  
  const budgetSpent = 120 - teamBudget; // Assuming 120Cr starting budget
  const budgetSpentRatio = budgetSpent / 120;
  
  let paceTarget;
  if (progress < 0.33) {
    paceTarget = dna.budgetPacing?.early || 0.35;
  } else if (progress < 0.66) {
    paceTarget = dna.budgetPacing?.mid || 0.60;
  } else {
    paceTarget = dna.budgetPacing?.late || 0.85;
  }

  const paceDeviation = budgetSpentRatio - paceTarget;
  
  if (paceDeviation > 0.15) {
    // Overspent! Cool down significantly
    valuation *= 0.6 + (Math.random() * 0.15);
  } else if (paceDeviation > 0.05) {
    // Slightly overspent — minor cooldown
    valuation *= 0.8 + (Math.random() * 0.1);
  } else if (paceDeviation < -0.15) {
    // Underspent! Can be more aggressive
    valuation *= 1.1 + (Math.random() * 0.2);
  }

  // Late-auction "spend or lose it" bonus: If lots of budget remains with few players left
  if (progress > 0.75 && teamBudget > 30 && squadSize < 18) {
    valuation *= 1.2 + (Math.random() * 0.3);
  }

  // ─── STEP 5: RIVALRY & EMOTION LAYER ──────────────────
  
  // 5a. Bluff bidding: bid on players they don't really want
  const bluffRoll = Math.random();
  if (bluffRoll < (dna.bluffChance || 0.05) && teamBudget > 25 && roleDeficit <= 0) {
    // Bluff bid — push price up on a player to drain rivals
    valuation = Math.max(valuation, calculateMarketValue(player) * (0.6 + Math.random() * 0.3));
  }

  // 5b. Panic buying: if behind on squad size late in auction
  if (squadSize < 10 && progress > 0.5 && roleDeficit > 0) {
    const panicBoost = 1.0 + (dna.riskTolerance * (Math.random() * 0.5));
    valuation *= panicBoost;
  }

  // 5c. "Walk-away moments": random chance to just... not bid
  const walkAwayChance = (1 - dna.riskTolerance) * 0.08;
  if (Math.random() < walkAwayChance && player.rating < 88) {
    return 0; // Bot decides "not today" — adds unpredictability
  }

  // 5d. Patience gate: patient bots skip early overs of bidding wars
  //     This is implemented by reducing valuation if patience is high
  //     and there are many remaining options
  if (dna.patience > 0.7 && countRemainingStars(roomPlayers, player.rating - 5) > 3) {
    valuation *= (1.0 - (dna.patience - 0.7) * 0.5); // Up to 15% reduction
  }

  // ─── STEP 6: RANDOMIZATION LAYER ──────────────────────
  
  const varianceSeed = Math.random();
  
  if (varianceSeed > 0.97) {
    // 3% chance: EXPLOSIVE spike — bot goes absolutely wild
    valuation *= 1.3 + (Math.random() * 0.4);
  } else if (varianceSeed < 0.05) {
    // 5% chance: Cold feet — bot drops valuation dramatically
    valuation *= 0.4 + (Math.random() * 0.2);
  } else if (varianceSeed > 0.90) {
    // 7% chance: Moderate spike
    valuation *= 1.1 + (Math.random() * 0.2);
  } else if (varianceSeed < 0.12) {
    // 7% chance: Hesitation — slight reduction
    valuation *= 0.75 + (Math.random() * 0.15);
  } else {
    // Normal variance: ±12%
    valuation *= 0.88 + (Math.random() * 0.24);
  }

  // ─── FINAL CAPPING & FORMATTING ───────────────────────
  
  // Hard budget cap
  if (valuation > maxPossibleBid) {
    valuation = maxPossibleBid;
  }

  // Minimum price check
  const basePrice = player.base_price || player.basePrice || 0.20;
  if (valuation > 0 && valuation < basePrice) {
    // Coin flip: bid base price or walk away
    if (Math.random() > 0.5 && roleDeficit > 0) {
      valuation = basePrice;
    } else {
      valuation = 0;
    }
  }

  return Number(Math.max(0, valuation).toFixed(2));
};


// ─────────────────────────────────────────────────────────────────
//  TRADE EVALUATION AI — Uses franchise DNA for negotiations
// ─────────────────────────────────────────────────────────────────

export const evaluateTradeOffer = (offeredPlayer, requestedPlayer, botTeamName, roomPlayers, cashOffer = 0, participants = []) => {
  const dna = BOT_STRATEGIES[botTeamName] || BOT_STRATEGIES['DC'];
  
  const botSquad = roomPlayers.filter(p => p.sold_to === botTeamName);
  const botParticipant = participants.find(p => p.team_name === botTeamName);
  const userParticipant = participants.find(p => p.team_name === offeredPlayer.sold_to);
  const botBudget = botParticipant?.budget || 0;
  const userBudget = userParticipant?.budget || 0;

  // Hard budget checks
  if (cashOffer < 0 && botBudget < Math.abs(cashOffer)) {
    return { accepted: false, reason: `We cannot afford to pay you ₹${Math.abs(cashOffer)} Cr. Trade rejected.`, canCounter: false };
  }
  if (cashOffer > 0 && userBudget < cashOffer) {
    return { accepted: false, reason: `You don't have enough budget (₹${cashOffer} Cr) to complete this trade!`, canCounter: false };
  }

  // Calculate player values using market value + DNA adjustments
  let offeredValue = calculateMarketValue(offeredPlayer) * dna.aggression;
  let requestedValue = calculateMarketValue(requestedPlayer) * dna.aggression;

  // Adjust for nationality bias
  if (offeredPlayer.country === 'India') offeredValue *= dna.indianBias;
  else offeredValue *= dna.overseasBias;
  if (requestedPlayer.country === 'India') requestedValue *= dna.indianBias;
  else requestedValue *= dna.overseasBias;

  // Star premium: bots value their own stars higher
  if (requestedPlayer.rating >= 90) requestedValue *= (1.0 + (dna.starHunger - 1.0) * 0.3);
  if (offeredPlayer.rating >= 90) offeredValue *= (1.0 + (dna.starHunger - 1.0) * 0.2);

  // Bot utility: gaining offered, losing requested, +/- cash
  const botUtility = offeredValue - requestedValue + cashOffer;

  // Squad need analysis
  const plan = dna.squadPlan || { Batsman: 6, Bowler: 6, 'All-Rounder': 4, Wicketkeeper: 2 };
  const botRoleCounts = {};
  ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'].forEach(role => {
    botRoleCounts[role] = botSquad.filter(p => p.role === role).length;
  });

  const needOffered = Math.max(0, (plan[offeredPlayer.role] || 4) - botRoleCounts[offeredPlayer.role]);
  const needRequested = Math.max(0, (plan[requestedPlayer.role] || 4) - botRoleCounts[requestedPlayer.role]);

  let roleAdjustment = 0;
  if (needOffered > needRequested) {
    roleAdjustment += 2.5 + (Math.random() * 1.5);
  } else if (needRequested > needOffered) {
    roleAdjustment -= 3.0 + (Math.random() * 1.5);
  }

  // Block: protect last wicketkeeper
  const botWkCount = botSquad.filter(p => p.role === 'Wicketkeeper').length;
  if (requestedPlayer.role === 'Wicketkeeper' && botWkCount <= 1) {
    return { accepted: false, reason: `We cannot trade ${requestedPlayer.name}, he is our only Wicketkeeper!`, canCounter: false };
  }

  // Block: protect franchise star (highest-rated player)
  const topPlayer = [...botSquad].sort((a, b) => b.rating - a.rating)[0];
  if (topPlayer && requestedPlayer.id === topPlayer.id && dna.starHunger > 1.2) {
    return { 
      accepted: false, 
      reason: `${requestedPlayer.name} is untouchable. He is the cornerstone of our franchise. No deal!`, 
      canCounter: false 
    };
  }

  const finalUtility = botUtility + roleAdjustment;
  
  // Acceptance threshold varies by personality — aggressive bots are harder negotiators
  const acceptThreshold = -0.5 + (dna.aggression - 1.0) * 2.0;

  if (finalUtility >= acceptThreshold) {
    // Random personality-flavored acceptance messages
    const messages = [
      `This trade strengthens our ${offeredPlayer.role} department. We accept!`,
      `${offeredPlayer.name} fits our plans perfectly. Deal done!`,
      `Our analytics team approves. Welcome aboard, ${offeredPlayer.name}!`,
      `The ${botTeamName} think-tank has evaluated this thoroughly. We accept the trade!`,
      `${requestedPlayer.name} will be missed, but ${offeredPlayer.name} fills a bigger need. Agreed!`,
    ];
    return { 
      accepted: true, 
      reason: messages[Math.floor(Math.random() * messages.length)], 
      canCounter: false 
    };
  }

  // Counter-offer logic: bot asks for cash to make the deal work
  const neededCash = requestedValue - offeredValue - roleAdjustment + (1.0 + Math.random() * 1.5);
  const roundedNeededCash = Number(neededCash.toFixed(2));

  const maxCounterGap = 6.0 + (dna.riskTolerance * 4.0); // More risk-tolerant bots accept wider gaps
  const isGapReasonable = Math.abs(roundedNeededCash - cashOffer) <= maxCounterGap;

  if (isGapReasonable) {
    if (roundedNeededCash > 0 && userBudget >= roundedNeededCash) {
      const counterMessages = [
        `We're not convinced yet. Add ₹${roundedNeededCash} Cr and we have a deal!`,
        `${requestedPlayer.name} is worth more to us. Sweeten the offer with ₹${roundedNeededCash} Cr cash!`,
        `Our management counter-proposes: ${offeredPlayer.name} + ₹${roundedNeededCash} Cr for ${requestedPlayer.name}. Final offer!`,
      ];
      return {
        accepted: false,
        reason: counterMessages[Math.floor(Math.random() * counterMessages.length)],
        canCounter: true,
        counterCash: roundedNeededCash
      };
    } else if (roundedNeededCash < 0) {
      const botOfferCash = Math.abs(roundedNeededCash);
      if (botBudget >= botOfferCash) {
        return {
          accepted: false,
          reason: `We'll consider parting with ${requestedPlayer.name} if we give you ₹${botOfferCash} Cr as a sweetener. That's our counter!`,
          canCounter: true,
          counterCash: roundedNeededCash
        };
      }
    }
  }

  // Hard rejection — personality-flavored messages
  const rejections = [
    `We are not interested in trading ${requestedPlayer.name} under these conditions. Not even close.`,
    `${requestedPlayer.name} stays. Our scouts don't rate ${offeredPlayer.name} highly enough.`,
    `The numbers don't add up for us. ${botTeamName} walks away from this deal.`,
    `We've discussed it and the answer is a firm no. ${requestedPlayer.name} is integral to our plans.`,
    `Perhaps if you had someone better to offer. ${offeredPlayer.name} doesn't move the needle for us.`,
  ];
  return { 
    accepted: false, 
    reason: rejections[Math.floor(Math.random() * rejections.length)], 
    canCounter: false 
  };
};
