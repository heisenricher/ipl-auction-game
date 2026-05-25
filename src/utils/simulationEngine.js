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
export const calculateTeamStrength = (teamName, allPlayers) => {
  const squad = allPlayers.filter(p => p.sold_to === teamName);
  
  if (squad.length === 0) return { batting: 50, bowling: 50, overall: 50 };

  const batters = squad.filter(p => p.role === 'Batsman' || p.role === 'Wicketkeeper').sort((a, b) => b.rating - a.rating);
  const bowlers = squad.filter(p => p.role === 'Bowler').sort((a, b) => b.rating - a.rating);
  const allRounders = squad.filter(p => p.role === 'All-Rounder').sort((a, b) => b.rating - a.rating);

  // Take top 6 batters + all-rounders for batting strength
  const topBatters = [...batters, ...allRounders].sort((a, b) => b.rating - a.rating).slice(0, 7);
  const batAvg = topBatters.length > 0 
    ? topBatters.reduce((sum, p) => sum + p.rating, 0) / topBatters.length 
    : 50;

  // Take top 5 bowlers + all-rounders for bowling strength
  const topBowlers = [...bowlers, ...allRounders].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const bowlAvg = topBowlers.length > 0 
    ? topBowlers.reduce((sum, p) => sum + p.rating, 0) / topBowlers.length 
    : 50;

  return {
    batting: batAvg,
    bowling: bowlAvg,
    overall: (batAvg + bowlAvg) / 2
  };
};

// 3. Simulate a single match
export const simulateMatch = (match, allPlayers) => {
  const strengthA = calculateTeamStrength(match.teamA, allPlayers);
  const strengthB = calculateTeamStrength(match.teamB, allPlayers);

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
    // 70% chance it's one of their top 3 rated players, 30% random
    winningSquad.sort((a, b) => b.rating - a.rating);
    if (Math.random() > 0.3) {
      const idx = Math.floor(Math.random() * Math.min(3, winningSquad.length));
      motm = winningSquad[idx].name;
    } else {
      const idx = Math.floor(Math.random() * winningSquad.length);
      motm = winningSquad[idx].name;
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
