// Simulation Engine for IPL Season — V2 with Full Match Commentary

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
    const activeBatters = [...batters, ...allRounders];
    batAvg = activeBatters.length > 0 
      ? activeBatters.reduce((sum, p) => sum + p.effectiveRating, 0) / activeBatters.length 
      : 50;

    const activeBowlers = [...bowlers, ...allRounders];
    bowlAvg = activeBowlers.length > 0 
      ? activeBowlers.reduce((sum, p) => sum + p.effectiveRating, 0) / activeBowlers.length 
      : 50;
  } else {
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


// ─── HELPER: Get the playing squad (XI or top performers) ────────────
const getPlayingSquad = (teamName, allPlayers, teamPlayingXIs = {}) => {
  const squad = allPlayers.filter(p => p.sold_to === teamName);
  const xiIds = teamPlayingXIs[teamName];
  if (xiIds && xiIds.length > 0) {
    return squad.filter(p => xiIds.includes(p.id));
  }
  return squad.sort((a, b) => b.rating - a.rating).slice(0, 11);
};


// ─── HELPER: Simulate a T20 innings over-by-over ────────────────────
const simulateInnings = (battingTeam, bowlingTeam, battingSquad, bowlingSquad, target = null) => {
  // Split squad into batting order and bowlers
  const battingOrder = [
    ...battingSquad.filter(p => p.role === 'Batsman' || p.role === 'Wicketkeeper'),
    ...battingSquad.filter(p => p.role === 'All-Rounder'),
    ...battingSquad.filter(p => p.role === 'Bowler'),
  ];

  const bowlerPool = [
    ...bowlingSquad.filter(p => p.role === 'Bowler'),
    ...bowlingSquad.filter(p => p.role === 'All-Rounder'),
  ];
  if (bowlerPool.length === 0) bowlerPool.push(...bowlingSquad.slice(0, 3));

  // Initialize batting stats
  const batStats = {};
  battingOrder.forEach(p => {
    batStats[p.id] = { name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: '' };
  });

  // Initialize bowling stats
  const bowlStats = {};
  bowlerPool.forEach(p => {
    bowlStats[p.id] = { name: p.name, overs: 0, balls: 0, runs: 0, wickets: 0, dots: 0 };
  });

  const commentary = [];
  let totalRuns = 0;
  let totalWickets = 0;
  let currentBatIdx = 0;
  let nonStrikerIdx = 1;
  const maxWickets = Math.min(10, battingOrder.length - 1);

  // Dismissal types
  const dismissals = [
    'caught at slip', 'caught at mid-off', 'caught at deep square', 'caught at long-on',
    'bowled through the gate', 'bowled clean', 'lbw plumb in front',
    'run out at the non-striker end', 'stumped down the leg side',
    'caught behind by the keeper', 'caught at point', 'caught at cover',
    'edged and taken at first slip', 'bowled by a stunning yorker',
  ];

  const boundaryShots = [
    'drives through cover', 'pulls over mid-wicket', 'cuts past point',
    'flicks off the pads', 'sweeps fine', 'lofts over long-off',
    'edges past the keeper', 'punches through extra-cover',
  ];

  const sixShots = [
    'launches over long-on for a MAXIMUM!', 'smashes it downtown for SIX!',
    'scoops over fine leg for SIX!', 'reverse-sweeps for SIX over third man!',
    'clobbers it over cow corner! SIX!', 'clears the ropes at mid-wicket! SIX!',
  ];

  for (let over = 1; over <= 20; over++) {
    if (totalWickets >= maxWickets) break;
    if (target !== null && totalRuns >= target) break;

    // Select bowler (round-robin, max 4 overs each)
    let bowlerIdx = (over - 1) % bowlerPool.length;
    let bowler = bowlerPool[bowlerIdx];
    // Ensure bowler hasn't exceeded 4 overs
    let attempts = 0;
    while (bowlStats[bowler.id].overs >= 4 && attempts < bowlerPool.length) {
      bowlerIdx = (bowlerIdx + 1) % bowlerPool.length;
      bowler = bowlerPool[bowlerIdx];
      attempts++;
    }

    let overRuns = 0;
    let overWickets = 0;
    let overEvents = [];
    let ballsThisOver = 0;

    for (let ball = 1; ball <= 6; ball++) {
      if (totalWickets >= maxWickets) break;
      if (target !== null && totalRuns >= target) break;

      const batsman = battingOrder[currentBatIdx];
      if (!batsman) break;

      ballsThisOver++;
      bowlStats[bowler.id].balls++;
      batStats[batsman.id].balls++;

      // Outcome probabilities based on ratings
      const batSkill = (batsman.rating || 75) / 100;
      const bowlSkill = (bowler.rating || 75) / 100;
      const matchup = batSkill - bowlSkill * 0.6;

      const rand = Math.random();
      
      // Powerplay boost (overs 1-6) and death overs boost (17-20)
      const isPowerplay = over <= 6;
      const isDeath = over >= 17;
      const phaseBoost = isPowerplay ? 0.08 : (isDeath ? 0.06 : 0);
      
      // Chase pressure (if chasing and behind required rate)
      let chasePressure = 0;
      if (target !== null) {
        const requiredRate = (target - totalRuns) / ((20 - over + 1) * 6 - ball + 1) * 6;
        if (requiredRate > 10) chasePressure = 0.04;
        if (requiredRate > 14) chasePressure = 0.08;
      }

      if (rand < 0.08 - matchup * 0.04 + bowlSkill * 0.03 - chasePressure * 0.5) {
        // WICKET!
        totalWickets++;
        overWickets++;
        const dismissal = dismissals[Math.floor(Math.random() * dismissals.length)];
        batStats[batsman.id].out = true;
        batStats[batsman.id].howOut = `${dismissal} off ${bowler.name}`;
        bowlStats[bowler.id].wickets++;
        overEvents.push(`${over}.${ball}: WICKET! ${batsman.name} ${dismissal} off ${bowler.name} for ${batStats[batsman.id].runs}(${batStats[batsman.id].balls})`);
        
        // Next batter comes in
        currentBatIdx = Math.max(currentBatIdx, nonStrikerIdx) + 1;
        if (currentBatIdx >= battingOrder.length) break;
      } else if (rand < 0.25 + matchup * 0.05 + phaseBoost) {
        // DOT BALL
        bowlStats[bowler.id].dots++;
      } else if (rand < 0.50 + matchup * 0.1 + phaseBoost + chasePressure) {
        // 1 or 2 runs
        const runs = Math.random() > 0.45 ? 2 : 1;
        totalRuns += runs;
        overRuns += runs;
        batStats[batsman.id].runs += runs;
        // Rotate strike on odd runs
        if (runs % 2 === 1) {
          const temp = currentBatIdx;
          currentBatIdx = nonStrikerIdx;
          nonStrikerIdx = temp;
        }
      } else if (rand < 0.75 + matchup * 0.08 + phaseBoost + chasePressure * 0.5) {
        // FOUR!
        totalRuns += 4;
        overRuns += 4;
        batStats[batsman.id].runs += 4;
        batStats[batsman.id].fours++;
        const shot = boundaryShots[Math.floor(Math.random() * boundaryShots.length)];
        overEvents.push(`${over}.${ball}: FOUR! ${batsman.name} ${shot}`);
      } else {
        // SIX!
        totalRuns += 6;
        overRuns += 6;
        batStats[batsman.id].runs += 6;
        batStats[batsman.id].sixes++;
        const shot = sixShots[Math.floor(Math.random() * sixShots.length)];
        overEvents.push(`${over}.${ball}: SIX! ${batsman.name} ${shot}`);
      }
    }

    // Update bowler overs
    if (bowlStats[bowler.id].balls % 6 === 0) {
      bowlStats[bowler.id].overs = bowlStats[bowler.id].balls / 6;
    } else {
      bowlStats[bowler.id].overs = Math.floor(bowlStats[bowler.id].balls / 6);
    }

    bowlStats[bowler.id].runs += overRuns;

    // Generate over summary line
    let overSummary = `Over ${over}: ${battingTeam} ${totalRuns}/${totalWickets}`;
    if (overWickets > 0) {
      overSummary += ` — ${overWickets} wicket${overWickets > 1 ? 's' : ''} fell!`;
    } else if (overRuns === 0) {
      overSummary += ` — Maiden over by ${bowler.name}!`;
    } else if (overRuns >= 15) {
      overSummary += ` — ${overRuns} runs! Carnage by the batsmen!`;
    } else if (overRuns >= 10) {
      overSummary += ` — ${overRuns} runs off the over. Expensive for ${bowler.name}.`;
    } else {
      overSummary += ` — ${overRuns} runs. ${bowler.name} bowls.`;
    }

    if (target !== null && totalRuns >= target) {
      overSummary += ` 🎉 Target reached!`;
    }

    commentary.push({
      over,
      summary: overSummary,
      events: overEvents,
      score: `${totalRuns}/${totalWickets}`,
      runRate: (totalRuns / over).toFixed(2),
    });

    // Rotate strike at end of over
    const temp2 = currentBatIdx;
    currentBatIdx = nonStrikerIdx;
    nonStrikerIdx = temp2;
  }

  // Format bowling overs display
  Object.keys(bowlStats).forEach(id => {
    const b = bowlStats[id];
    const fullOvers = Math.floor(b.balls / 6);
    const remBalls = b.balls % 6;
    b.oversDisplay = remBalls > 0 ? `${fullOvers}.${remBalls}` : `${fullOvers}`;
  });

  return {
    totalRuns,
    totalWickets,
    overs: commentary.length,
    runRate: commentary.length > 0 ? (totalRuns / commentary.length).toFixed(2) : '0.00',
    batStats: Object.values(batStats),
    bowlStats: Object.values(bowlStats),
    commentary,
  };
};


// 3. Simulate a single match with full commentary
export const simulateMatch = (match, allPlayers, teamCaptains = {}, playerMorale = {}, teamPlayingXIs = {}) => {
  const strengthA = calculateTeamStrength(match.teamA, allPlayers, teamCaptains, playerMorale, teamPlayingXIs);
  const strengthB = calculateTeamStrength(match.teamB, allPlayers, teamCaptains, playerMorale, teamPlayingXIs);

  // Get squads
  const squadA = getPlayingSquad(match.teamA, allPlayers, teamPlayingXIs);
  const squadB = getPlayingSquad(match.teamB, allPlayers, teamPlayingXIs);

  // Determine toss
  const tossWinner = Math.random() > 0.5 ? match.teamA : match.teamB;
  const elected = Math.random() > 0.45 ? 'bat' : 'bowl'; // slight bias to bat first in T20

  let firstBatTeam, secondBatTeam, firstBatSquad, secondBatSquad, firstBowlSquad, secondBowlSquad;

  if ((tossWinner === match.teamA && elected === 'bat') || (tossWinner === match.teamB && elected === 'bowl')) {
    firstBatTeam = match.teamA;
    secondBatTeam = match.teamB;
    firstBatSquad = squadA;
    firstBowlSquad = squadB;
    secondBatSquad = squadB;
    secondBowlSquad = squadA;
  } else {
    firstBatTeam = match.teamB;
    secondBatTeam = match.teamA;
    firstBatSquad = squadB;
    firstBowlSquad = squadA;
    secondBatSquad = squadA;
    secondBowlSquad = squadB;
  }

  // First innings
  const innings1 = simulateInnings(firstBatTeam, secondBatTeam, firstBatSquad, firstBowlSquad);
  
  // Second innings (chasing target)
  const target = innings1.totalRuns + 1;
  const innings2 = simulateInnings(secondBatTeam, firstBatTeam, secondBatSquad, secondBowlSquad, target);

  // Determine winner
  let winner, loser, isTie = false;
  let marginText = '';

  if (innings2.totalRuns >= target) {
    winner = secondBatTeam;
    loser = firstBatTeam;
    const wicketsLeft = 10 - innings2.totalWickets;
    marginText = `${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
  } else if (innings2.totalRuns === innings1.totalRuns) {
    isTie = true;
    winner = Math.random() > 0.5 ? match.teamA : match.teamB;
    loser = winner === match.teamA ? match.teamB : match.teamA;
    marginText = 'Super Over';
  } else {
    winner = firstBatTeam;
    loser = secondBatTeam;
    const runDiff = innings1.totalRuns - innings2.totalRuns;
    marginText = `${runDiff} run${runDiff !== 1 ? 's' : ''}`;
  }

  // Find top performers
  const topBatter1 = [...innings1.batStats].sort((a, b) => b.runs - a.runs)[0];
  const topBowler1 = [...innings1.bowlStats].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];
  const topBatter2 = [...innings2.batStats].sort((a, b) => b.runs - a.runs)[0];
  const topBowler2 = [...innings2.bowlStats].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];

  // MOTM selection — highest impact performance
  const performances = [
    { name: topBatter1?.name, team: firstBatTeam, impact: (topBatter1?.runs || 0) * 1.2 },
    { name: topBowler1?.name, team: secondBatTeam, impact: (topBowler1?.wickets || 0) * 25 + Math.max(0, 24 - (topBowler1?.runs || 99)) },
    { name: topBatter2?.name, team: secondBatTeam, impact: (topBatter2?.runs || 0) * 1.2 },
    { name: topBowler2?.name, team: firstBatTeam, impact: (topBowler2?.wickets || 0) * 25 + Math.max(0, 24 - (topBowler2?.runs || 99)) },
  ].filter(p => p.name).sort((a, b) => b.impact - a.impact);

  const motm = performances.length > 0 ? performances[0].name : 'Unknown';

  return {
    ...match,
    played: true,
    result: {
      winner,
      loser,
      isTie,
      motm,
      margin: marginText,
      toss: { winner: tossWinner, elected },
      innings1: {
        team: firstBatTeam,
        score: `${innings1.totalRuns}/${innings1.totalWickets}`,
        overs: innings1.overs,
        runRate: innings1.runRate,
        batStats: innings1.batStats,
        bowlStats: innings1.bowlStats,
        commentary: innings1.commentary,
      },
      innings2: {
        team: secondBatTeam,
        score: `${innings2.totalRuns}/${innings2.totalWickets}`,
        overs: innings2.overs,
        runRate: innings2.runRate,
        batStats: innings2.batStats,
        bowlStats: innings2.bowlStats,
        commentary: innings2.commentary,
      },
      topPerformers: {
        topBatter: topBatter1?.runs >= topBatter2?.runs ? topBatter1 : topBatter2,
        topBowler: topBowler1?.wickets >= topBowler2?.wickets ? topBowler1 : topBowler2,
      },
    }
  };
};
