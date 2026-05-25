// Simulation Engine for IPL Season

// 1. Generate a Single Round-Robin Schedule
export const generateSchedule = (participants) => {
  const teams = participants.map(p => p.team_name);
  if (teams.length < 2) return [];

  const schedule = [];
  let matchId = 1;

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      schedule.push({
        id: matchId++,
        teamA: teams[i],
        teamB: teams[j],
        played: false,
        result: null
      });
    }
  }

  // Shuffle the schedule for randomness
  return schedule.sort(() => Math.random() - 0.5);
};

// 2. Calculate Team Strength based on drafted players
export const calculateTeamStrength = (teamName, allPlayers, teamCaptains = {}, playerMorale = {}, teamPlayingXIs = {}) => {
  let squad = allPlayers.filter(p => p.sold_to === teamName);
  
  if (squad.length === 0) return { batting: 50, bowling: 50, overall: 50 };

  const captains = teamCaptains[teamName] || {};
  let synergyBoost = 0;
  let penalty = 0;
  let isPlayingXI = false;

  const xiIds = teamPlayingXIs[teamName];
  if (xiIds && xiIds.length > 0) {
    isPlayingXI = true;
    squad = squad.filter(p => xiIds.includes(p.id));
    
    // Lineup validations & penalties
    const wkCount = squad.filter(p => p.role === 'Wicketkeeper').length;
    const overseasCount = squad.filter(p => p.country !== 'India').length;
    
    if (wkCount === 0) penalty += 5; // Penalty for no wicketkeeper
    if (overseasCount > 4) penalty += 5; // Penalty for too many overseas players
    if (squad.length !== 11) penalty += 10; // Penalty for not playing exactly 11 players
  }

  // Apply Morale and Captaincy Boosts to individual ratings
  squad = squad.map(p => {
    let effectiveRating = p.rating;
    
    // Morale (Form)
    if (playerMorale[p.id]) {
      effectiveRating += playerMorale[p.id];
    }

    // Captaincy Boost
    if (p.id == captains.captain) {
      effectiveRating += 3;
      if (p.rating >= 85) synergyBoost += 2.0; // Good captain boosts team
    }
    if (p.id == captains.viceCaptain) {
      effectiveRating += 1.5;
    }

    return { ...p, effectiveRating };
  });

  const batters = squad.filter(p => p.role === 'Batsman' || p.role === 'Wicketkeeper').sort((a, b) => b.effectiveRating - a.effectiveRating);
  const bowlers = squad.filter(p => p.role === 'Bowler').sort((a, b) => b.effectiveRating - a.effectiveRating);
  const allRounders = squad.filter(p => p.role === 'All-Rounder').sort((a, b) => b.effectiveRating - a.effectiveRating);

  let batAvg, bowlAvg;

  if (isPlayingXI) {
    // Average all batters and all-rounders in selected XI
    const activeBatters = [...batters, ...allRounders];
    batAvg = activeBatters.length > 0 
      ? activeBatters.reduce((sum, p) => sum + p.effectiveRating, 0) / activeBatters.length 
      : 50;

    // Average all bowlers and all-rounders in selected XI
    const activeBowlers = [...bowlers, ...allRounders];
    bowlAvg = activeBowlers.length > 0 
      ? activeBowlers.reduce((sum, p) => sum + p.effectiveRating, 0) / activeBowlers.length 
      : 50;
  } else {
    // Default top performance averages
    const topBatters = [...batters, ...allRounders].sort((a, b) => b.effectiveRating - a.effectiveRating).slice(0, 7);
    batAvg = topBatters.length > 0 
      ? topBatters.reduce((sum, p) => sum + p.effectiveRating, 0) / topBatters.length 
      : 50;

    const topBowlers = [...bowlers, ...allRounders].sort((a, b) => b.effectiveRating - a.effectiveRating).slice(0, 5);
    bowlAvg = topBowlers.length > 0 
      ? topBowlers.reduce((sum, p) => sum + p.effectiveRating, 0) / topBowlers.length 
      : 50;
  }

  return {
    batting: Math.max(30, Number((batAvg + synergyBoost - penalty).toFixed(1))),
    bowling: Math.max(30, Number((bowlAvg + synergyBoost - penalty).toFixed(1))),
    overall: Math.max(30, Number((((batAvg + bowlAvg) / 2) + synergyBoost - penalty).toFixed(1)))
  };
};

// 3. Simulate a single match
export const simulateMatch = (match, allPlayers, teamCaptains = {}, playerMorale = {}, teamPlayingXIs = {}) => {
  const strengthA = calculateTeamStrength(match.teamA, allPlayers, teamCaptains, playerMorale, teamPlayingXIs);
  const strengthB = calculateTeamStrength(match.teamB, allPlayers, teamCaptains, playerMorale, teamPlayingXIs);

  // RNG Factor (Luck plays a part in T20!)
  const rngA = (Math.random() * 20) - 10; // -10 to +10
  const rngB = (Math.random() * 20) - 10;

  const scoreA = strengthA.overall + rngA;
  const scoreB = strengthB.overall + rngB;

  let winner, loser, isTie = false;
  
  if (Math.abs(scoreA - scoreB) < 1.0) {
    // Super Over scenario! (Coin flip)
    isTie = true;
    winner = Math.random() > 0.5 ? match.teamA : match.teamB;
    loser = winner === match.teamA ? match.teamB : match.teamA;
  } else if (scoreA > scoreB) {
    winner = match.teamA;
    loser = match.teamB;
  } else {
    winner = match.teamB;
    loser = match.teamA;
  }

  // Find a Man of the Match (MOTM) from the winning team
  const winningSquad = allPlayers.filter(p => p.sold_to === winner);
  let motm = "Unknown Player";
  if (winningSquad.length > 0) {
    // If playing XI exists, select MOTM from the playing XI!
    let candidates = winningSquad;
    const xiIds = teamPlayingXIs[winner];
    if (xiIds && xiIds.length > 0) {
      candidates = candidates.filter(p => xiIds.includes(p.id));
    }
    
    candidates.sort((a, b) => b.rating - a.rating);
    if (candidates.length > 0) {
      if (Math.random() > 0.3) {
        const idx = Math.floor(Math.random() * Math.min(3, candidates.length));
        motm = candidates[idx].name;
      } else {
        const idx = Math.floor(Math.random() * candidates.length);
        motm = candidates[idx].name;
      }
    }
  }

  return {
    ...match,
    played: true,
    result: {
      winner,
      loser,
      isTie,
      motm,
      margin: isTie ? "Super Over" : (Math.abs(scoreA - scoreB) > 10 ? "Dominated" : "Close Game")
    }
  };
};
