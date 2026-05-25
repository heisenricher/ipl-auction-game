import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Calendar, Play, ChevronRight, Award, Swords, Home, Star, X, 
  MessageSquare, BarChart3, Coins, DollarSign, Sparkles, ShieldCheck, 
  Building2, MapPin, Sliders, Ticket, Flame, Dumbbell, UserCheck, History, 
  User, ListOrdered, ArrowRight
} from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import { FRANCHISES } from '../utils/constants';
import { generateSchedule, simulateMatch, calculateTeamStrength } from '../utils/simulationEngine';

// Heuristic to pick the optimal valid playing XI
const autoSelectBestXI = (squad) => {
  if (squad.length === 0) return [];
  const sorted = [...squad].sort((a, b) => b.rating - a.rating);
  
  // Find first Wicketkeeper
  const wk = sorted.find(p => p.role === 'Wicketkeeper');
  const selected = [];
  if (wk) selected.push(wk);

  // Add players prioritizing higher rating, respecting max 4 overseas
  for (const p of sorted) {
    if (selected.length === 11) break;
    if (wk && p.id === wk.id) continue;

    const isOverseas = p.country !== 'India';
    const currentOverseasCount = selected.filter(sp => sp.country !== 'India').length;

    if (isOverseas && currentOverseasCount >= 4) {
      continue;
    }
    selected.push(p);
  }

  // Fill up if we still don't have 11
  if (selected.length < 11) {
    for (const p of sorted) {
      if (selected.length === 11) break;
      if (!selected.find(sp => sp.id === p.id)) {
        selected.push(p);
      }
    }
  }

  return selected.map(p => p.id);
};

const SeasonDashboard = ({
  participants,
  allPlayers,
  userId,
  handleLeaveRoom,
  handleProceedToTrade
}) => {
  // Navigation Tabs
  const [dashboardTab, setDashboardTab] = useState('campaign'); // 'campaign' | 'playingXI' | 'training' | 'stadium' | 'stats'
  
  // Tycoon State Variables
  const [franchiseCash, setFranchiseCash] = useState(5.0); // Starts at ₹5.00 Cr
  const [trainingPoints, setTrainingPoints] = useState(50); // Starts at 50 TP
  const [evolvedPlayers, setEvolvedPlayers] = useState({}); // keys: playerId, values: { ratingBoost, batBoost, bowlBoost }
  const [ticketPrice, setTicketPrice] = useState(1500); // Standard ₹1,500 ticket price
  const [tycoonLogs, setTycoonLogs] = useState([
    '🔥 Welcome to the Franchise Empire! Draft complete. Sign sponsors and train your players to dominate!'
  ]);

  // Stadium configuration
  const [stadiumConfig, setStadiumConfig] = useState({
    name: 'Franchise Stadium',
    capacity: 35000,
    capacityLevel: 1,
    pitchType: 'Standard', // 'Standard', 'Flat Track', 'Green Top', 'Dusty'
    luxuryBoxes: false, // yields extra income
    fanZone: false, // boosts home advantage
    satisfaction: 85 // Starts at 85%
  });

  // Sponsorship contracts state
  const [sponsorships, setSponsorships] = useState([
    {
      id: 'spon_1',
      name: 'Pinnacle Energy',
      logoText: '⚡ PINNACLE',
      color: '#0284c7', // Sky Blue
      upfront: 3.5, // Cr
      bonus: 4.5, // Cr
      goalText: 'Win 5 matches total this season',
      goalType: 'wins',
      goalTarget: 5,
      progress: 0,
      signed: false,
      completed: false,
      failed: false
    },
    {
      id: 'spon_2',
      name: 'Apex Telecom',
      logoText: '📶 APEX',
      color: '#8b5cf6', // Violet
      upfront: 4.0, // Cr
      bonus: 5.5, // Cr
      goalText: 'Reach Top 4 in the Points Table',
      goalType: 'top4',
      progress: 0,
      signed: false,
      completed: false,
      failed: false
    },
    {
      id: 'spon_3',
      name: 'Horizon Beverages',
      logoText: '🥤 HORIZON',
      color: '#10b981', // Emerald
      upfront: 2.5, // Cr
      bonus: 3.0, // Cr
      goalText: 'Play 4 matches with a fully legal playing XI',
      goalType: 'legal_xi',
      goalTarget: 4,
      progress: 0,
      signed: false,
      completed: false,
      failed: false
    },
    {
      id: 'spon_4',
      name: 'Antigravity AI',
      logoText: '🌌 ANTIGRAVITY',
      color: '#ec4899', // Pink
      upfront: 5.0, // Cr
      bonus: 7.0, // Cr
      goalText: 'Have the Orange or Purple Cap winner in your squad',
      goalType: 'caps',
      progress: 0,
      signed: false,
      completed: false,
      failed: false
    }
  ]);

  // Standard Season State Variables
  const [schedule, setSchedule] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [champion, setChampion] = useState(null);
  
  // Calculate strengths once on load
  const [teamStrengths, setTeamStrengths] = useState({});
  const [teamCaptains, setTeamCaptains] = useState({});
  const [playerMorale, setPlayerMorale] = useState({});
  const [teamPlayingXIs, setTeamPlayingXIs] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null); // for scorecard modal
  const [scorecardTab, setScorecardTab] = useState('scorecard'); // 'scorecard' | 'commentary'
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState(null); // for Career Profile Hub modal

  const userTeam = useMemo(() => {
    return participants.find(p => p.user_id === userId)?.team_name;
  }, [participants, userId]);

  // Dynamic Stadium Naming based on Team selection
  useEffect(() => {
    if (userTeam) {
      const stadiumNames = {
        'RCB': 'M. Chinnaswamy Stadium',
        'MI': 'Wankhede Stadium',
        'CSK': 'M. A. Chidambaram Stadium',
        'KKR': 'Eden Gardens',
        'RR': 'Sawai Mansingh Stadium',
        'SRH': 'Rajiv Gandhi International Stadium',
        'DC': 'Arun Jaitley Stadium',
        'PBKS': 'IS Bindra PCA Stadium, Mohali',
        'LSG': 'Bharat Ratna Atal Bihari Vajpayee Ekana Stadium',
        'GT': 'Narendra Modi Stadium'
      };
      setStadiumConfig(prev => ({
        ...prev,
        name: stadiumNames[userTeam] || `${userTeam} Arena`
      }));
    }
  }, [userTeam]);

  // Local Players array that incorporates rating evolutions dynamically
  const localPlayers = useMemo(() => {
    return allPlayers.map(p => {
      if (evolvedPlayers[p.id]) {
        const ep = evolvedPlayers[p.id];
        return {
          ...p,
          rating: p.rating + (ep.ratingBoost || 0),
          stats: {
            ...p.stats,
            primary: p.stats?.primary && p.stats.primary.includes('Runs') 
              ? `Runs: ${parseInt(p.stats.primary.replace('Runs: ', '')) + (ep.batBoost || 0) * 15}`
              : p.stats?.primary
          }
        };
      }
      return p;
    });
  }, [allPlayers, evolvedPlayers]);

  // Initialize schedule and tables
  useEffect(() => {
    if (participants.length > 0) {
      // Init schedule
      const newSchedule = generateSchedule(participants);
      setSchedule(newSchedule);

      // Init points table
      const initialPoints = participants.map(p => ({
        team_name: p.team_name,
        user_name: p.user_name,
        isBot: p.isBot,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0
      }));
      setPointsTable(initialPoints);

      // Pre-calc strengths for UI display
      const strengths = {};
      const initCaptains = {};
      const initMorale = {};
      const initPlayingXIs = {};
      
      participants.forEach(p => {
        // Auto-assign bots Captains
        const squad = localPlayers.filter(pl => pl.sold_to === p.team_name).sort((a,b) => b.rating - a.rating);
        if (squad.length > 1) {
          initCaptains[p.team_name] = { captain: squad[0].id, viceCaptain: squad[1].id };
        }
        
        // Morale
        squad.forEach(pl => {
           initMorale[pl.id] = Math.floor(Math.random() * 11) - 5; // -5 to +5
        });

        // Auto-assign Best XI
        initPlayingXIs[p.team_name] = autoSelectBestXI(squad);
      });
      setTeamCaptains(initCaptains);
      setPlayerMorale(initMorale);
      setTeamPlayingXIs(initPlayingXIs);

      participants.forEach(p => {
        strengths[p.team_name] = calculateTeamStrength(p.team_name, localPlayers, initCaptains, initMorale, initPlayingXIs);
      });
      setTeamStrengths(strengths);
    }
  }, [participants, allPlayers]); // Only runs on component load or participants changes

  // Update team strengths when XI, Captain, or Ratings evolve
  useEffect(() => {
    if (participants.length > 0 && Object.keys(teamCaptains).length > 0) {
      const strengths = {};
      participants.forEach(p => {
        strengths[p.team_name] = calculateTeamStrength(p.team_name, localPlayers, teamCaptains, playerMorale, teamPlayingXIs);
      });
      setTeamStrengths(strengths);
    }
  }, [teamPlayingXIs, teamCaptains, evolvedPlayers, playerMorale]);

  // Aggregate Season Statistics for Caps & Profiles
  const playerStats = useMemo(() => {
    const stats = {};
    
    // Initialize stats structure for every drafted player
    localPlayers.forEach(p => {
      if (p.sold_to) {
        stats[p.name] = {
          id: p.id,
          name: p.name,
          role: p.role,
          sold_to: p.sold_to,
          rating: p.rating,
          country: p.country,
          image: p.image,
          matches: 0,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          runsConceded: 0,
          ballsBowled: 0,
          highScore: 0,
          bestBowlWickets: 0,
          bestBowlRuns: 999,
          fifties: 0,
          hundreds: 0,
          wickets3: 0,
          matchLog: []
        };
      }
    });

    // Traverse all played matches to compile stats
    schedule.filter(m => m.played).forEach(match => {
      const inn1 = match.result.innings1;
      const inn2 = match.result.innings2;

      [inn1, inn2].forEach((inn, innIdx) => {
        const opposingTeam = innIdx === 0 ? inn2.team : inn1.team;

        // Batting stats aggregation
        if (inn.batStats) {
          inn.batStats.forEach(bat => {
            if (!stats[bat.name]) return;
            const p = stats[bat.name];
            p.matches++;
            p.runs += bat.runs;
            p.balls += bat.balls;
            p.fours += bat.fours;
            p.sixes += bat.sixes;
            if (bat.runs > p.highScore) p.highScore = bat.runs;
            if (bat.runs >= 100) p.hundreds++;
            else if (bat.runs >= 50) p.fifties++;

            p.matchLog.push({
              matchId: match.id,
              opponent: opposingTeam,
              type: 'batting',
              runs: bat.runs,
              balls: bat.balls,
              fours: bat.fours,
              sixes: bat.sixes,
              out: bat.out,
              howOut: bat.howOut,
              oversBowled: 0,
              runsConceded: 0,
              wickets: 0
            });
          });
        }

        // Bowling stats aggregation
        if (inn.bowlStats) {
          inn.bowlStats.forEach(bowl => {
            if (!stats[bowl.name]) return;
            const p = stats[bowl.name];
            
            // Check if this player already added a match log entry from batting. If so, merge!
            let logEntry = p.matchLog.find(l => l.matchId === match.id);
            if (!logEntry) {
              p.matches++;
              logEntry = {
                matchId: match.id,
                opponent: opposingTeam,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                out: false,
                howOut: '',
                oversBowled: 0,
                runsConceded: 0,
                wickets: 0
              };
              p.matchLog.push(logEntry);
            }

            p.wickets += bowl.wickets;
            p.runsConceded += bowl.runs;
            p.ballsBowled += bowl.balls;
            if (bowl.wickets >= 3) p.wickets3++;

            if (bowl.wickets > p.bestBowlWickets || (bowl.wickets === p.bestBowlWickets && bowl.runs < p.bestBowlRuns)) {
              p.bestBowlWickets = bowl.wickets;
              p.bestBowlRuns = bowl.runs;
            }

            logEntry.type = logEntry.type ? 'all-round' : 'bowling';
            logEntry.oversBowled = bowl.oversDisplay || bowl.overs;
            logEntry.runsConceded = bowl.runs;
            logEntry.wickets = bowl.wickets;
          });
        }
      });
    });

    // Compute MVP Score for each player
    const statsList = Object.values(stats);
    statsList.forEach(p => {
      p.mvpScore = (p.runs * 1.0) + (p.sixes * 2.5) + (p.fours * 1.5) + (p.wickets * 20.0) + (p.wickets3 * 10.0) + (p.fifties * 15.0) + (p.hundreds * 30.0);
    });

    return stats;
  }, [schedule, localPlayers]);

  // Leaders calculations
  const orangeLeader = useMemo(() => {
    const list = Object.values(playerStats).filter(p => p.runs > 0).sort((a, b) => b.runs - a.runs);
    return list.length > 0 ? list[0] : null;
  }, [playerStats]);

  const purpleLeader = useMemo(() => {
    const list = Object.values(playerStats).filter(p => p.wickets > 0).sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);
    return list.length > 0 ? list[0] : null;
  }, [playerStats]);

  const mvpLeader = useMemo(() => {
    const list = Object.values(playerStats).filter(p => p.mvpScore > 0).sort((a, b) => b.mvpScore - a.mvpScore);
    return list.length > 0 ? list[0] : null;
  }, [playerStats]);

  // Sponsorship Milestones Tracking Effect
  useEffect(() => {
    if (schedule.length === 0 || !userTeam) return;

    const playedMatches = schedule.filter(m => m.played);
    const userWins = playedMatches.filter(m => m.result.winner === userTeam).length;

    // Legal squad count
    let legalSquadMatches = 0;
    playedMatches.filter(m => m.teamA === userTeam || m.teamB === userTeam).forEach(match => {
      const userXI = teamPlayingXIs[userTeam] || [];
      const squad = localPlayers.filter(p => p.sold_to === userTeam);
      const pickedSquad = squad.filter(p => userXI.includes(p.id));
      const wkCount = pickedSquad.filter(p => p.role === 'Wicketkeeper').length;
      const overseasCount = pickedSquad.filter(p => p.country !== 'India').length;
      if (userXI.length === 11 && wkCount >= 1 && overseasCount <= 4) {
        legalSquadMatches++;
      }
    });

    setSponsorships(prev => prev.map(spon => {
      if (!spon.signed || spon.completed || spon.failed) return spon;

      let completed = false;
      let failed = false;
      let progress = 0;

      if (spon.goalType === 'wins') {
        progress = userWins;
        if (userWins >= spon.goalTarget) completed = true;
      } else if (spon.goalType === 'legal_xi') {
        progress = legalSquadMatches;
        if (legalSquadMatches >= spon.goalTarget) completed = true;
      } else if (spon.goalType === 'top4') {
        progress = pointsTable.findIndex(row => row.team_name === userTeam) + 1; // current position
        const seasonFinished = schedule.every(m => m.played);
        if (seasonFinished) {
          const userPos = pointsTable.findIndex(row => row.team_name === userTeam);
          if (userPos >= 0 && userPos <= 3) {
            completed = true;
          } else {
            failed = true;
          }
        }
      } else if (spon.goalType === 'caps') {
        const seasonFinished = schedule.every(m => m.played);
        if (seasonFinished) {
          const ownsOrange = orangeLeader?.sold_to === userTeam;
          const ownsPurple = purpleLeader?.sold_to === userTeam;
          if (ownsOrange || ownsPurple) {
            completed = true;
          } else {
            failed = true;
          }
        }
      }

      if (completed) {
        setFranchiseCash(c => Number((c + spon.bonus).toFixed(2)));
        const logMsg = `🏆 Sponsor Goal Met! ${spon.name} paid a performance bonus of ₹${spon.bonus} Cr!`;
        setTycoonLogs(logs => [logMsg, ...logs]);
        return { ...spon, completed: true, progress: spon.goalTarget || 1 };
      }

      if (failed) {
        return { ...spon, failed: true };
      }

      return { ...spon, progress };
    }));
  }, [schedule, pointsTable, orangeLeader, purpleLeader]);

  // Adjusts player ratings based on Home/Away status and Home Stadium configurations
  const getSimPlayersForMatch = (match, basePlayers) => {
    const isUserHome = match.teamA === userTeam;
    const isUserAway = match.teamB === userTeam;

    return basePlayers.map(p => {
      let ratingBoost = 0;

      // 1. Home Team advantage
      if (isUserHome && p.sold_to === userTeam) {
        ratingBoost += 1.5;
        if (stadiumConfig.fanZone) ratingBoost += 2.0; // Fan Zone infrastructure upgrade
      } else if (isUserAway && p.sold_to === match.teamA) {
        ratingBoost += 2.0; // Bot stadium home advantage
      }

      // 2. Pitch Type modifications (only applies to user home stadium)
      if (isUserHome && (p.sold_to === match.teamA || p.sold_to === match.teamB)) {
        if (stadiumConfig.pitchType === 'Flat Track') {
          if (p.role === 'Batsman' || p.role === 'Wicketkeeper') {
            ratingBoost += 4.0;
          } else if (p.role === 'Bowler') {
            ratingBoost -= 2.0; // Tough for bowlers
          }
        } else if (stadiumConfig.pitchType === 'Green Top') {
          if (p.role === 'Bowler') {
            ratingBoost += 4.0;
          } else if (p.role === 'Batsman') {
            ratingBoost -= 2.0; // Tough for batters
          }
        } else if (stadiumConfig.pitchType === 'Dusty') {
          if (p.role === 'Bowler' || p.role === 'All-Rounder') {
            ratingBoost += 3.0; // Boost spinners/all-rounders
          }
        }
      }

      if (ratingBoost === 0) return p;
      return {
        ...p,
        rating: Math.min(99, Math.max(50, Number((p.rating + ratingBoost).toFixed(1))))
      };
    });
  };

  // Tycoon processing after a simulated match
  const processMatchTycoon = (match) => {
    const isUserHome = match.teamA === userTeam;
    
    // Add TP
    setTrainingPoints(prev => prev + 10);
    
    if (isUserHome) {
      // Calculate Ticket Sales
      let attendanceFactor = 0.90;
      let satChange = 0;
      
      if (ticketPrice === 500) {
        attendanceFactor = 1.0;
        satChange = 5;
      } else if (ticketPrice === 1500) {
        attendanceFactor = 0.90;
        satChange = 0;
      } else if (ticketPrice === 3000) {
        attendanceFactor = 0.65;
        satChange = -5;
      }
      
      // Update satisfaction
      setStadiumConfig(prev => {
        const nextSat = Math.min(100, Math.max(30, prev.satisfaction + satChange));
        
        // Calculate attendance volume based on capacity and pricing factor
        const finalAttendance = Math.floor(prev.capacity * attendanceFactor * (nextSat / 100));
        
        // Ticket Revenue: capacity * factor * price
        const ticketRev = finalAttendance * ticketPrice * 0.0000001; 
        
        // Luxury Boxes fixed passive income
        const luxuryRev = prev.luxuryBoxes ? 1.50 : 0.0;
        
        const totalMatchdayCash = Number((ticketRev + luxuryRev).toFixed(2));
        setFranchiseCash(c => Number((c + totalMatchdayCash).toFixed(2)));
        
        const logMsg = `🏡 Home Matchday at ${prev.name}: Earned ₹${totalMatchdayCash} Cr! (Attendance: ${finalAttendance.toLocaleString()} spectators, Fan Mood: ${nextSat}%)`;
        setTycoonLogs(logs => [logMsg, ...logs]);

        return {
          ...prev,
          satisfaction: nextSat
        };
      });
    }
  };

  const handleSimulateNextMatch = () => {
    const nextMatchIdx = schedule.findIndex(m => !m.played);
    if (nextMatchIdx === -1) return;

    const match = schedule[nextMatchIdx];
    
    // Apply stadium pitch boosts to players
    const simPlayers = getSimPlayersForMatch(match, localPlayers);
    const simulatedMatch = simulateMatch(match, simPlayers, teamCaptains, playerMorale, teamPlayingXIs);

    // Update Schedule
    const newSchedule = [...schedule];
    newSchedule[nextMatchIdx] = simulatedMatch;
    setSchedule(newSchedule);

    // Update Points Table
    updatePointsTable(simulatedMatch);

    // Run tycoon earnings
    processMatchTycoon(match);
  };

  const handleSimulateAll = () => {
    const unplayed = schedule.filter(m => !m.played);
    if (unplayed.length === 0) return;

    const newSchedule = [...schedule];
    const newPointsTable = [...pointsTable]; // Start from current

    unplayed.forEach(match => {
      const simPlayers = getSimPlayersForMatch(match, localPlayers);
      const simulated = simulateMatch(match, simPlayers, teamCaptains, playerMorale, teamPlayingXIs);
      const idx = newSchedule.findIndex(m => m.id === match.id);
      newSchedule[idx] = simulated;

      // Inline update to newPointsTable
      const winnerRow = newPointsTable.find(r => r.team_name === simulated.result.winner);
      const loserRow = newPointsTable.find(r => r.team_name === simulated.result.loser);
      
      if (winnerRow && loserRow) {
        winnerRow.played++;
        loserRow.played++;
        if (simulated.result.isTie) {
          winnerRow.tied++;
          loserRow.tied++;
          winnerRow.points += 2;
          winnerRow.won++; // Super Over win
        } else {
          winnerRow.won++;
          loserRow.lost++;
          winnerRow.points += 2;
        }
      }

      // Run tycoon earnings per match
      processMatchTycoon(match);
    });

    setSchedule(newSchedule);
    
    const sorted = newPointsTable.sort((a, b) => b.points - a.points || b.won - a.won);
    setPointsTable(sorted);
    setChampion(sorted[0].team_name);
  };

  const updatePointsTable = (simulatedMatch) => {
    setPointsTable(prev => {
      const updated = prev.map(row => {
        if (row.team_name === simulatedMatch.result.winner) {
          return { ...row, played: row.played + 1, won: row.won + 1, points: row.points + 2 };
        } else if (row.team_name === simulatedMatch.result.loser) {
          return { ...row, played: row.played + 1, lost: row.lost + 1 };
        }
        return row;
      });
      return updated.sort((a, b) => b.points - a.points || b.won - a.won);
    });

    if (schedule.filter(m => !m.played).length <= 1) {
      setChampion(pointsTable.sort((a, b) => b.points - a.points)[0].team_name);
    }
  };
  
  useEffect(() => {
    if (schedule.length > 0 && schedule.every(m => m.played)) {
      setChampion(pointsTable[0]?.team_name);
    }
  }, [schedule, pointsTable]);

  // Tycoon Training Actions
  const handleTrainPlayer = (playerId, drillType) => {
    if (trainingPoints < 10) return;

    setTrainingPoints(prev => prev - 10);
    setEvolvedPlayers(prev => {
      const ep = prev[playerId] || { ratingBoost: 0, batBoost: 0, bowlBoost: 0 };
      let ratingBoost = ep.ratingBoost;
      let batBoost = ep.batBoost;
      let bowlBoost = ep.bowlBoost;

      const player = localPlayers.find(p => p.id === playerId);
      let alertMsg = '';

      if (drillType === 'batting') {
        batBoost += 2;
        ratingBoost += 2;
        alertMsg = `🎯 Trained ${player.name} in power-hitting drills! Rating boosted +2!`;
      } else if (drillType === 'bowling') {
        bowlBoost += 2;
        ratingBoost += 2;
        alertMsg = `🎯 Trained ${player.name} in target-bowling drills! Rating boosted +2!`;
      } else if (drillType === 'fitness') {
        ratingBoost += 1;
        alertMsg = `🎯 Trained ${player.name} in physical conditioning! Morale spiked and rating +1!`;
        // spike player morale
        setPlayerMorale(prevMorale => ({
          ...prevMorale,
          [playerId]: Math.min(10, (prevMorale[playerId] || 0) + 5)
        }));
      }

      setTycoonLogs(logs => [alertMsg, ...logs]);

      return {
        ...prev,
        [playerId]: { ratingBoost, batBoost, bowlBoost }
      };
    });
  };

  // Stadium Upgrade Actions
  const handleBuyUpgrade = (upgradeType, cost) => {
    if (franchiseCash < cost) return;

    setFranchiseCash(prev => Number((prev - cost).toFixed(2)));
    setStadiumConfig(prev => {
      let updated = { ...prev };
      let msg = '';
      if (upgradeType === 'capacity') {
        updated.capacity = 55000;
        updated.capacityLevel = 2;
        msg = `🏗️ Seating Expanded! Home capacity increased to 55,000 seats!`;
      } else if (upgradeType === 'luxury') {
        updated.luxuryBoxes = true;
        msg = `🏗️ Luxury Suites Constructed! Yields passive ₹1.50 Cr per home game!`;
      } else if (upgradeType === 'fanzone') {
        updated.fanZone = true;
        msg = `🏗️ Fan Zone built! Home advantage strength boosted!`;
      }

      setTycoonLogs(logs => [msg, ...logs]);
      return updated;
    });
  };

  // Sign Sponsorship Action
  const handleSignSponsor = (sponId, upfrontCash) => {
    const signedCount = sponsorships.filter(s => s.signed).length;
    if (signedCount >= 2) return;

    setFranchiseCash(c => Number((c + upfrontCash).toFixed(2)));
    setSponsorships(prev => prev.map(s => {
      if (s.id === sponId) {
        const msg = `✍️ Signed ${s.name} as Shirt Sponsor! Upfront bonus of ₹${s.upfront} Cr credited. Target goal activated.`;
        setTycoonLogs(logs => [msg, ...logs]);
        return { ...s, signed: true };
      }
      return s;
    }));
  };

  const nextMatch = schedule.find(m => !m.played);

  // Avatar Initials render
  const renderPlayerAvatar = (player, sizeClass = "w-12 h-12") => {
    const isHighRated = player.rating >= 90;
    const initials = player.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=ffffff&bold=true&size=128`;
    
    return (
      <div style={{ position: 'relative', width: 'fit-content' }}>
        <div 
          style={{ 
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${isHighRated ? '#f59e0b' : '#cbd5e1'}`,
            boxShadow: isHighRated ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
            position: 'relative',
            backgroundColor: '#f1f5f9'
          }}
          className={sizeClass}
        >
          <img 
            src={player.image && !player.image.includes('No_image_available') ? player.image : avatarUrl} 
            alt={player.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.src = avatarUrl; }}
          />
        </div>
        {isHighRated && (
          <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '9px', backgroundColor: '#f59e0b', color: '#fff', padding: '1px 4px', borderRadius: '50%', fontWeight: '900', border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
            ★
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto w-full my-8 flex flex-col gap-6 view-enter-active" style={{ padding: '0 16px' }}>
      
      {/* ─── TYCOON HUB TABS & HEADERS ─── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px 32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 10 }}>
          <Trophy size={42} style={{ color: '#059669' }} />
          <div>
            <h1 className="font-display" style={{ fontSize: '30px', fontWeight: '800', lineHeight: '1.1', color: '#0f172a', textTransform: 'uppercase' }}>
              Franchise Empire Simulator
            </h1>
            <p style={{ color: '#475569', fontSize: '14px', marginTop: '2px' }}>
              Home stadium: <strong>{stadiumConfig.name}</strong> • Season schedule active
            </p>
          </div>
        </div>

        {/* Tycoon Cash & Training Ticker */}
        <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 10 }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} style={{ color: '#16a34a' }} />
            <div>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#15803d', fontWeight: '800' }}>Empire Cash</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#14532d' }}>₹{franchiseCash.toFixed(2)} Cr</div>
            </div>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#2563eb' }} />
            <div>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#1d4ed8', fontWeight: '800' }}>Training Points</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e3a8a' }}>{trainingPoints} TP</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #cbd5e1/40', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <button onClick={handleLeaveRoom} className="btn-secondary" style={{ fontSize: '11px', padding: '8px 14px' }}>
            <Home size={14} /> Exit
          </button>
          {handleProceedToTrade && (
            <button onClick={handleProceedToTrade} className="btn-secondary font-display" style={{ fontSize: '11px', padding: '8px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={14} /> Trade Market
            </button>
          )}
        </div>
      </div>

      {champion && (
        <div className="animate-fadeInUp" style={{ backgroundColor: '#fffbeb', borderRadius: '24px', padding: '40px', border: '2px solid #f59e0b', boxShadow: '0 10px 30px -5px rgba(245, 158, 11, 0.2)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200/50 via-transparent to-transparent pointer-events-none" />
           <Trophy size={64} style={{ color: '#d97706', margin: '0 auto 16px', position: 'relative', zIndex: 10 }} />
           <h2 className="font-display" style={{ fontSize: '24px', color: '#b45309', marginBottom: '8px', position: 'relative', zIndex: 10 }}>CHAMPIONS OF THE SEASON</h2>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', position: 'relative', zIndex: 10 }}>
              <TeamLogo teamId={champion} className="w-16 h-16" />
              <span className="font-display" style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a' }}>{champion}</span>
           </div>
           {champion === userTeam && (
             <div className="font-display animate-pulse" style={{ marginTop: '16px', fontSize: '18px', color: '#059669', fontWeight: 'bold' }}>CONGRATULATIONS, YOUR SQUAD WON THE LEAGUE! 🎉</div>
           )}
        </div>
      )}

      {/* ─── TAB NAVIGATION BAR ─── */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="custom-scroll">
        {[
          { id: 'campaign', label: 'Campaign Hub', icon: Swords },
          { id: 'playingXI', label: 'Lineup Builder', icon: UserCheck },
          { id: 'training', label: 'Training Camp', icon: Dumbbell },
          { id: 'stadium', label: 'Stadium & Tycoon', icon: Building2 },
          { id: 'stats', label: 'Tournament Stats', icon: ListOrdered }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setDashboardTab(tab.id)}
            style={{
              padding: '12px 18px',
              fontSize: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              borderBottom: dashboardTab === tab.id ? '3px solid #059669' : '3px solid transparent',
              color: dashboardTab === tab.id ? '#059669' : '#64748b',
              backgroundColor: dashboardTab === tab.id ? '#ecfdf5' : 'transparent',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              transition: 'all 0.2s',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontFamily: "'Outfit', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0
            }}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENTS ─── */}
      <div className="view-enter-active">
        
        {/* 1. CAMPAIGN HUB TAB */}
        {dashboardTab === 'campaign' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Col: Points Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Award size={24} style={{ color: '#059669' }} /> POINTS TABLE
                </h2>

                <div className="responsive-table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Franchise</th>
                        <th style={{ textAlign: 'center' }}>STR</th>
                        <th style={{ textAlign: 'center' }}>P</th>
                        <th style={{ textAlign: 'center' }}>W</th>
                        <th style={{ textAlign: 'center' }}>L</th>
                        <th style={{ textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }}>PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsTable.map((row, idx) => {
                        const teamInfo = FRANCHISES.find(f => f.id === row.team_name);
                        const isUser = row.team_name === userTeam;
                        const str = teamStrengths[row.team_name]?.overall.toFixed(1) || '0.0';
                        
                        return (
                          <tr key={row.team_name} style={{ backgroundColor: isUser ? '#ecfdf5' : 'transparent', fontWeight: isUser ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                            <td style={{ fontWeight: 'bold', color: idx === 0 ? '#d97706' : '#64748b' }}>{idx + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <TeamLogo teamId={row.team_name} className="w-8 h-8" />
                                <div>
                                  <div style={{ color: teamInfo?.color || '#0f172a', fontWeight: '800' }}>{row.team_name}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{row.user_name} {row.isBot ? '(BOT)' : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>{str}</td>
                            <td style={{ textAlign: 'center' }}>{row.played}</td>
                            <td style={{ textAlign: 'center', color: '#059669' }}>{row.won}</td>
                            <td style={{ textAlign: 'center', color: '#dc2626' }}>{row.lost}</td>
                            <td style={{ textAlign: 'center', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>{row.points}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tycoon Audit logs feed */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} /> Tycoon Financial Log
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }} className="custom-scroll">
                  {tycoonLogs.map((log, idx) => (
                    <div key={idx} style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '3px solid #059669', color: '#334155', fontWeight: '500' }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Col: Simulation Console & Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Simulation console */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase' }}>Simulation Console</h3>
                
                {champion ? (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', fontStyle: 'italic', padding: '20px 0' }}>
                    Season Complete!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {nextMatch && (
                      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Up Next: Match {nextMatch.id}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                          <span className="font-display" style={{ fontSize: '16px', fontWeight: 'bold' }}>{nextMatch.teamA}</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>vs</span>
                          <span className="font-display" style={{ fontSize: '16px', fontWeight: 'bold' }}>{nextMatch.teamB}</span>
                        </div>
                        {nextMatch.teamA === userTeam && (
                          <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '10px', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                            🏡 User Home Game at {stadiumConfig.name}!
                          </span>
                        )}
                      </div>
                    )}
                    
                    <button onClick={handleSimulateNextMatch} className="btn-primary" style={{ justifyContent: 'center' }}>
                      <Play size={18} /> Sim Next Match
                    </button>
                    <button onClick={handleSimulateAll} className="btn-secondary" style={{ justifyContent: 'center' }}>
                      <ChevronRight size={18} /> Sim Entire Season
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Results */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxHeight: '350px', overflowY: 'auto' }} className="custom-scroll">
                <h3 className="font-display" style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Results Feed
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {schedule.filter(m => m.played).reverse().map(match => (
                    <div 
                      key={match.id} 
                      onClick={() => { setSelectedMatch(match); setScorecardTab('scorecard'); }}
                      style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        <span>Match {match.id}</span>
                        <span style={{ color: '#059669' }}>{match.result.margin}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                        <span style={{ color: match.result.winner === match.teamA ? '#0f172a' : '#94a3b8' }}>{match.teamA}</span>
                        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>vs</span>
                        <span style={{ color: match.result.winner === match.teamB ? '#0f172a' : '#94a3b8' }}>{match.teamB}</span>
                      </div>
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '11px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: '#d97706' }}>{match.result.winner}</span> won
                        </div>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700' }}>TAP FOR SCORE</span>
                      </div>
                    </div>
                  ))}
                  {schedule.filter(m => m.played).length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '13px', padding: '20px 0' }}>
                      No matches played yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. PLAYING XI BUILDER TAB */}
        {dashboardTab === 'playingXI' && userTeam && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <Star size={24} style={{ color: '#f59e0b' }} /> LINEUP BUILDER & SQUAD
                </h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>Drag or click to choose your Playing XI, Captain and Vice Captain</p>
              </div>
              
              <button
                onClick={() => {
                  const squad = localPlayers.filter(pl => pl.sold_to === userTeam);
                  const bestXI = autoSelectBestXI(squad);
                  setTeamPlayingXIs({ ...teamPlayingXIs, [userTeam]: bestXI });
                }}
                className="font-display hover-gold"
                style={{ fontSize: '12px', fontWeight: 'bold', padding: '8px 16px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                ⚡ Auto-Select Best XI
              </button>
            </div>

            {/* Captain / Vice Captain row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Select Captain (C) (+3 Strength Boost)</label>
                <select 
                  value={teamCaptains[userTeam]?.captain || ''}
                  onChange={(e) => {
                    const newCap = { ...teamCaptains, [userTeam]: { ...teamCaptains[userTeam], captain: e.target.value } };
                    setTeamCaptains(newCap);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">Select a player...</option>
                  {localPlayers.filter(p => p.sold_to === userTeam).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Rat: {p.rating})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Select Vice-Captain (VC) (+1.5 Boost)</label>
                <select 
                  value={teamCaptains[userTeam]?.viceCaptain || ''}
                  onChange={(e) => {
                    const newCap = { ...teamCaptains, [userTeam]: { ...teamCaptains[userTeam], viceCaptain: e.target.value } };
                    setTeamCaptains(newCap);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">Select a player...</option>
                  {localPlayers.filter(p => p.sold_to === userTeam).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Rat: {p.rating})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* XI Selection Live validation board */}
            {(() => {
              const userXI = teamPlayingXIs[userTeam] || [];
              const squad = localPlayers.filter(p => p.sold_to === userTeam);
              const pickedSquad = squad.filter(p => userXI.includes(p.id));
              const wkCount = pickedSquad.filter(p => p.role === 'Wicketkeeper').length;
              const overseasCount = pickedSquad.filter(p => p.country !== 'India').length;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Live validation bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                    <div style={{ border: '1px solid', borderColor: userXI.length === 11 ? '#86efac' : '#fecaca', backgroundColor: userXI.length === 11 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Squad Size</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: userXI.length === 11 ? '#15803d' : '#b91c1c' }}>{userXI.length} / 11</span>
                    </div>

                    <div style={{ border: '1px solid', borderColor: wkCount >= 1 ? '#86efac' : '#fecaca', backgroundColor: wkCount >= 1 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Wicketkeepers</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: wkCount >= 1 ? '#15803d' : '#b91c1c' }}>{wkCount} (Min 1)</span>
                    </div>

                    <div style={{ border: '1px solid', borderColor: overseasCount <= 4 ? '#86efac' : '#fecaca', backgroundColor: overseasCount <= 4 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Overseas Limit</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: overseasCount <= 4 ? '#15803d' : '#b91c1c' }}>{overseasCount} / 4 (Max 4)</span>
                    </div>
                  </div>

                  {/* Warning Messages */}
                  {(userXI.length !== 11 || wkCount === 0 || overseasCount > 4) && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '12px', color: '#b45309', fontWeight: '600' }} className="animate-pulse">
                      ⚠️ Lineup is currently illegal. Simulating home or away matches with an illegal squad will apply a heavy <strong>-10 overall strength penalty</strong>!
                    </div>
                  )}

                  {/* Grid of Players with Pick buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginTop: '8px' }}>
                    {squad.map(p => {
                      const isPicked = userXI.includes(p.id);
                      const isCap = teamCaptains[userTeam]?.captain == p.id;
                      const isVc = teamCaptains[userTeam]?.viceCaptain == p.id;
                      const moraleVal = playerMorale[p.id] || 0;
                      const ep = evolvedPlayers[p.id];

                      return (
                        <div 
                          key={p.id}
                          style={{ 
                            padding: '16px', 
                            borderRadius: '16px', 
                            border: isPicked ? '2px solid #22c55e' : '1px solid #e2e8f0',
                            backgroundColor: isPicked ? '#f0fdf4' : '#ffffff',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedPlayerProfile(p)}
                        >
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {renderPlayerAvatar(p, "w-12 h-12")}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{p.role} • {p.country === 'India' ? '🇮🇳 Ind' : '✈️ Overseas'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                {p.rating}
                              </span>
                              {ep && ep.ratingBoost > 0 && (
                                <div style={{ fontSize: '9px', color: '#059669', fontWeight: '800', marginTop: '2px' }}>+{ep.ratingBoost} evolved</div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #cbd5e1/40' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {isCap && <span style={{ fontSize: '9px', backgroundColor: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>C</span>}
                              {isVc && <span style={{ fontSize: '9px', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>VC</span>}
                              <span style={{ fontSize: '10px', color: moraleVal > 0 ? '#16a34a' : moraleVal < 0 ? '#dc2626' : '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                Form: {moraleVal > 0 ? `+${moraleVal}` : moraleVal}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // prevent opening profile modal
                                let newXI = [...userXI];
                                if (isPicked) {
                                  newXI = newXI.filter(id => id !== p.id);
                                } else {
                                  newXI.push(p.id);
                                }
                                setTeamPlayingXIs({ ...teamPlayingXIs, [userTeam]: newXI });
                              }}
                              style={{ 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                padding: '6px 12px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                cursor: 'pointer',
                                backgroundColor: isPicked ? '#ef4444' : '#22c55e',
                                color: '#ffffff',
                                transition: 'background-color 0.2s'
                              }}
                            >
                              {isPicked ? 'BENCH' : 'PLAY XI'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. TRAINING CAMP TAB */}
        {dashboardTab === 'training' && userTeam && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <Dumbbell size={24} style={{ color: '#2563eb' }} /> MONEYBALL TRAINING CAMP
                </h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>Spend your Training Points (TP) to run specialized drills. Boost player ratings permanently!</p>
              </div>
              <div style={{ padding: '8px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#2563eb' }} />
                <span className="font-display" style={{ fontWeight: '800', color: '#1e3a8a' }}>{trainingPoints} TP Available</span>
              </div>
            </div>

            {trainingPoints < 10 && (
              <div style={{ padding: '10px 16px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                💡 Tip: You earn <strong>+10 Training Points (TP)</strong> after every simulated match! Simulate games to gather more TP.
              </div>
            )}

            {/* Drills explanation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Flame size={16} style={{ color: '#ef4444' }} />
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>BATTERS DRILLS (10 TP)</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569' }}>Permanently boosts batting rating by +2 and increments runs stats capacity. Best for Batsmen / WKs.</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>BOWLERS DRILLS (10 TP)</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569' }}>Permanently boosts bowling rating by +2. Increases wickets taking logic in matches. Best for Bowlers / ARs.</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Sparkles size={16} style={{ color: '#f59e0b' }} />
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>FITNESS CAMP (10 TP)</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569' }}>Permanently boosts overall rating by +1 and spikes player Morale/Form by +5. Good for all roles.</p>
              </div>
            </div>

            {/* Squad Training list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {localPlayers.filter(p => p.sold_to === userTeam).map(p => {
                const ep = evolvedPlayers[p.id] || { ratingBoost: 0, batBoost: 0, bowlBoost: 0 };
                const moraleVal = playerMorale[p.id] || 0;
                
                return (
                  <div key={p.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {renderPlayerAvatar(p, "w-10 h-10")}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{p.role} • Form: {moraleVal}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>{p.rating}</div>
                        {ep.ratingBoost > 0 && (
                          <div style={{ fontSize: '9px', color: '#2563eb', fontWeight: '800' }}>+{ep.ratingBoost} XP</div>
                        )}
                      </div>
                    </div>

                    {/* Drill Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '8px', borderTop: '1px solid #cbd5e1/40' }}>
                      <button
                        disabled={trainingPoints < 10}
                        onClick={() => handleTrainPlayer(p.id, p.role === 'Bowler' ? 'bowling' : 'batting')}
                        style={{
                          padding: '6px 8px',
                          fontSize: '10px',
                          fontWeight: '800',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                          backgroundColor: trainingPoints >= 10 ? '#eff6ff' : '#f1f5f9',
                          color: trainingPoints >= 10 ? '#1d4ed8' : '#94a3b8',
                          cursor: trainingPoints >= 10 ? 'pointer' : 'not-allowed',
                          textAlign: 'center'
                        }}
                      >
                        {p.role === 'Bowler' ? '🎯 Bowl Drills' : '🏏 Bat Drills'}
                      </button>
                      <button
                        disabled={trainingPoints < 10}
                        onClick={() => handleTrainPlayer(p.id, 'fitness')}
                        style={{
                          padding: '6px 8px',
                          fontSize: '10px',
                          fontWeight: '800',
                          borderRadius: '6px',
                          border: '1px solid #fef9c3',
                          backgroundColor: trainingPoints >= 10 ? '#fef9c3' : '#f1f5f9',
                          color: trainingPoints >= 10 ? '#a16207' : '#94a3b8',
                          cursor: trainingPoints >= 10 ? 'pointer' : 'not-allowed',
                          textAlign: 'center'
                        }}
                      >
                        💪 Fitness Camp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. STADIUM & TYCOON MANAGER TAB */}
        {dashboardTab === 'stadium' && userTeam && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Col: Stadium Upgrades & Pricing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <Building2 size={24} style={{ color: '#059669' }} /> STADIUM & ticket management
                </h2>

                {/* Home Stadium Card */}
                <div style={{ padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#15803d', fontWeight: '800', letterSpacing: '0.05em' }}>User Home Stadium</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#14532d' }}>{stadiumConfig.name}</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#475569', fontWeight: 'bold' }}>SEATING CAPACITY</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{stadiumConfig.capacity.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#475569', fontWeight: 'bold' }}>FAN MOOD & SATISFACTION</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: stadiumConfig.satisfaction >= 80 ? '#16a34a' : (stadiumConfig.satisfaction >= 50 ? '#d97706' : '#dc2626') }}>{stadiumConfig.satisfaction}%</div>
                    </div>
                  </div>
                </div>

                {/* Ticket pricing selector */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>SET MATCHDAY TICKET PRICING</h3>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[
                      { price: 500, label: 'Low (₹500)', effect: '100% capacity attendance, boosts fan satisfaction +5% per game' },
                      { price: 1500, label: 'Medium (₹1500)', effect: '90% capacity attendance, stable satisfaction' },
                      { price: 3000, label: 'High (₹3000)', effect: '65% capacity attendance, lowers satisfaction -5% per game' }
                    ].map(tier => (
                      <div 
                        key={tier.price}
                        onClick={() => setTicketPrice(tier.price)}
                        style={{
                          flex: 1,
                          padding: '16px',
                          borderRadius: '16px',
                          border: ticketPrice === tier.price ? '2px solid #059669' : '1px solid #cbd5e1',
                          backgroundColor: ticketPrice === tier.price ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: '900', color: ticketPrice === tier.price ? '#14532d' : '#334155' }}>{tier.label}</span>
                        <span style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.2' }}>{tier.effect}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pitch Prep selector */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>PITCH PREPARATION (TACTICAL BOOSTS)</h3>
                  <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>Prep the pitch to suit your team style. Pitch affects both teams during Home Games.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {[
                      { id: 'Standard', name: 'Standard Pitch', desc: 'No boosts. Perfectly neutral.' },
                      { id: 'Flat Track', name: 'Flat Track', desc: '🏏 Batters get +4, Bowlers -2 rating.' },
                      { id: 'Green Top', name: 'Green Top', desc: '🥎 Bowlers get +4, Batters -2 rating.' },
                      { id: 'Dusty', name: 'Dusty Pitch', desc: '🌀 Spinners & All-Rounders get +3 rating.' }
                    ].map(pitch => (
                      <div
                        key={pitch.id}
                        onClick={() => setStadiumConfig(prev => ({ ...prev, pitchType: pitch.id }))}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: stadiumConfig.pitchType === pitch.id ? '2px solid #059669' : '1px solid #cbd5e1',
                          backgroundColor: stadiumConfig.pitchType === pitch.id ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a' }}>{pitch.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', lineHeight: '1.3' }}>{pitch.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upgrades */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>STADIUM INFRASTRUCTURE UPGRADES</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Capacity upgrade */}
                    <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>EXPAND CAPACITY (55,000 SEATS)</span>
                      <p style={{ fontSize: '11px', color: '#64748b', flexGrow: 1 }}>Increases seating, yielding +40% ticket revenue on home matchdays.</p>
                      <button
                        disabled={stadiumConfig.capacityLevel >= 2 || franchiseCash < 6.0}
                        onClick={() => handleBuyUpgrade('capacity', 6.0)}
                        style={{
                          padding: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: stadiumConfig.capacityLevel >= 2 ? '#cbd5e1' : (franchiseCash >= 6.0 ? '#059669' : '#fecaca'),
                          color: '#ffffff',
                          cursor: stadiumConfig.capacityLevel < 2 && franchiseCash >= 6.0 ? 'pointer' : 'not-allowed',
                          textAlign: 'center'
                        }}
                      >
                        {stadiumConfig.capacityLevel >= 2 ? 'FULLY UPGRADED' : 'UPGRADE (₹6.00 Cr)'}
                      </button>
                    </div>

                    {/* Luxury boxes */}
                    <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>CONSTRUCT LUXURY BOXES</span>
                      <p style={{ fontSize: '11px', color: '#64748b', flexGrow: 1 }}>Build VIP Suites. Earns a fixed passive bonus of <strong>+₹1.50 Cr</strong> per home match.</p>
                      <button
                        disabled={stadiumConfig.luxuryBoxes || franchiseCash < 8.0}
                        onClick={() => handleBuyUpgrade('luxury', 8.0)}
                        style={{
                          padding: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: stadiumConfig.luxuryBoxes ? '#cbd5e1' : (franchiseCash >= 8.0 ? '#059669' : '#fecaca'),
                          color: '#ffffff',
                          cursor: !stadiumConfig.luxuryBoxes && franchiseCash >= 8.0 ? 'pointer' : 'not-allowed',
                          textAlign: 'center'
                        }}
                      >
                        {stadiumConfig.luxuryBoxes ? 'CONSTRUCTED' : 'CONSTRUCT (₹8.00 Cr)'}
                      </button>
                    </div>

                    {/* Fan Zone */}
                    <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>BUILD ULTRA FAN ZONE</span>
                      <p style={{ fontSize: '11px', color: '#64748b', flexGrow: 1 }}>Build a fan-screaming amphitheater behind the bowler's end. Boosts overall squad simulation strength by **+2 rating** at home.</p>
                      <button
                        disabled={stadiumConfig.fanZone || franchiseCash < 3.0}
                        onClick={() => handleBuyUpgrade('fanzone', 3.0)}
                        style={{
                          padding: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: stadiumConfig.fanZone ? '#cbd5e1' : (franchiseCash >= 3.0 ? '#059669' : '#fecaca'),
                          color: '#ffffff',
                          cursor: !stadiumConfig.fanZone && franchiseCash >= 3.0 ? 'pointer' : 'not-allowed',
                          textAlign: 'center'
                        }}
                      >
                        {stadiumConfig.fanZone ? 'BUILT' : 'BUILD FAN ZONE (₹3.00 Cr)'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Col: Sponsorship board */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px', textTransform: 'uppercase' }}>SPONSORSHIP DEALS</h3>
                <p style={{ color: '#64748b', fontSize: '11px', marginBottom: '16px' }}>Sign up to <strong>2 shirt sponsors</strong> to get upfront cash boosts and milestone payouts.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sponsorships.map(spon => {
                    const activeSigned = sponsorships.filter(s => s.signed).length;
                    
                    return (
                      <div 
                        key={spon.id}
                        style={{ 
                          padding: '16px', 
                          borderRadius: '16px', 
                          border: `1px solid ${spon.signed ? spon.color : '#e2e8f0'}`,
                          backgroundColor: spon.signed ? `${spon.color}05` : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: spon.color }}>{spon.logoText}</span>
                          {spon.signed ? (
                            spon.completed ? (
                              <span style={{ fontSize: '9px', backgroundColor: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>COMPLETED</span>
                            ) : spon.failed ? (
                              <span style={{ fontSize: '9px', backgroundColor: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>FAILED</span>
                            ) : (
                              <span style={{ fontSize: '9px', backgroundColor: spon.color, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>ACTIVE</span>
                            )
                          ) : (
                            <button
                              disabled={activeSigned >= 2}
                              onClick={() => handleSignSponsor(spon.id, spon.upfront)}
                              style={{ 
                                fontSize: '10px', 
                                fontWeight: '800', 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                border: 'none',
                                cursor: activeSigned < 2 ? 'pointer' : 'not-allowed',
                                backgroundColor: activeSigned < 2 ? '#0f172a' : '#cbd5e1',
                                color: '#ffffff'
                              }}
                            >
                              SIGN CONTRACT
                            </button>
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{spon.name}</div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{spon.goalText}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', fontWeight: 'bold', paddingTop: '6px', borderTop: '1px dashed #cbd5e1/40' }}>
                          <span>Upfront: ₹{spon.upfront} Cr</span>
                          <span style={{ color: '#16a34a' }}>Milestone Payout: ₹{spon.bonus} Cr</span>
                        </div>

                        {spon.signed && !spon.completed && !spon.failed && spon.goalTarget && (
                          <div style={{ marginTop: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569', fontWeight: '700', marginBottom: '2px' }}>
                              <span>Progress</span>
                              <span>{spon.progress} / {spon.goalTarget}</span>
                            </div>
                            <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (spon.progress / spon.goalTarget) * 100)}%`, height: '100%', backgroundColor: spon.color }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 5. TOURNAMENT STATS TAB */}
        {dashboardTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Orange Cap Leaderboard */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '2px solid #f59e0b' }}>
                <span style={{ fontSize: '20px' }}>🍊</span>
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>Orange Cap (Runs)</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.values(playerStats).filter(p => p.runs > 0).sort((a,b) => b.runs - a.runs).slice(0, 5).map((player, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPlayerProfile(player)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fffbeb'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <span style={{ fontWeight: 'bold', color: idx === 0 ? '#f59e0b' : '#64748b', fontSize: '14px', width: '16px' }}>{idx+1}</span>
                    {renderPlayerAvatar(player, "w-8 h-8")}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>{player.sold_to} • M: {player.matches}</div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{player.runs}</span>
                  </div>
                ))}
                {Object.values(playerStats).filter(p => p.runs > 0).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '16px' }}>Simulate matches to populate cap lists!</div>
                )}
              </div>
            </div>

            {/* Purple Cap Leaderboard */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '2px solid #8b5cf6' }}>
                <span style={{ fontSize: '20px' }}>🍇</span>
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>Purple Cap (Wkts)</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.values(playerStats).filter(p => p.wickets > 0).sort((a,b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded).slice(0, 5).map((player, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPlayerProfile(player)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <span style={{ fontWeight: 'bold', color: idx === 0 ? '#8b5cf6' : '#64748b', fontSize: '14px', width: '16px' }}>{idx+1}</span>
                    {renderPlayerAvatar(player, "w-8 h-8")}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>{player.sold_to} • M: {player.matches}</div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{player.wickets}</span>
                  </div>
                ))}
                {Object.values(playerStats).filter(p => p.wickets > 0).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '16px' }}>Simulate matches to populate cap lists!</div>
                )}
              </div>
            </div>

            {/* MVP Leaderboard */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '2px solid #10b981' }}>
                <span style={{ fontSize: '20px' }}>👑</span>
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>Most Valuable Player</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.values(playerStats).filter(p => p.mvpScore > 0).sort((a,b) => b.mvpScore - a.mvpScore).slice(0, 5).map((player, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPlayerProfile(player)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ecfdf5'; e.currentTarget.style.borderColor = '#10b981'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <span style={{ fontWeight: 'bold', color: idx === 0 ? '#10b981' : '#64748b', fontSize: '14px', width: '16px' }}>{idx+1}</span>
                    {renderPlayerAvatar(player, "w-8 h-8")}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>{player.sold_to} • M: {player.matches}</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#059669', backgroundColor: '#e6fffa', padding: '2px 6px', borderRadius: '4px' }}>{player.mvpScore.toFixed(0)}</span>
                  </div>
                ))}
                {Object.values(playerStats).filter(p => p.mvpScore > 0).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '16px' }}>Simulate matches to populate Cap lists!</div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ─── SCORECARD MODAL ─── */}
      {selectedMatch && selectedMatch.result.innings1 && (
        <div 
          className="animate-fadeIn"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setSelectedMatch(null)}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-fadeInUp"
            style={{ position: 'relative', width: '100%', maxWidth: '800px', maxHeight: '85vh', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Match {selectedMatch.id} Scorecard</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="font-display" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TeamLogo teamId={selectedMatch.teamA} className="w-8 h-8" />
                    <span style={{ fontSize: '20px', fontWeight: '800', color: selectedMatch.result.winner === selectedMatch.teamA ? '#0f172a' : '#94a3b8' }}>{selectedMatch.teamA}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>vs</span>
                  <div className="font-display" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TeamLogo teamId={selectedMatch.teamB} className="w-8 h-8" />
                    <span style={{ fontSize: '20px', fontWeight: '800', color: selectedMatch.result.winner === selectedMatch.teamB ? '#0f172a' : '#94a3b8' }}>{selectedMatch.teamB}</span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: '600' }}>
                  {selectedMatch.result.toss && `Toss: ${selectedMatch.result.toss.winner} elected to ${selectedMatch.result.toss.elected}`}
                  {' • '}
                  <span style={{ color: '#d97706', fontWeight: '700' }}>{selectedMatch.result.winner} won by {selectedMatch.result.margin}</span>
                  {selectedMatch.result.motm && <span> • MOTM: <strong>{selectedMatch.result.motm}</strong></span>}
                </div>
              </div>
              <button onClick={() => setSelectedMatch(null)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}>
                <X size={18} style={{ color: '#64748b' }} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', padding: '12px 28px 0', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              {[{ id: 'scorecard', label: 'Scorecard', icon: BarChart3 }, { id: 'commentary', label: 'Commentary', icon: MessageSquare }].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setScorecardTab(tab.id)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    borderBottom: scorecardTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                    color: scorecardTab === tab.id ? '#0f172a' : '#94a3b8',
                    backgroundColor: 'transparent',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontFamily: "'Outfit', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }} className="custom-scroll">
              {scorecardTab === 'scorecard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {[selectedMatch.result.innings1, selectedMatch.result.innings2].map((inn, innIdx) => (
                    <div key={innIdx}>
                      {/* Innings Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <TeamLogo teamId={inn.team} className="w-7 h-7" />
                          <span className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{inn.team}</span>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{innIdx === 0 ? '1st Innings' : '2nd Innings'}</span>
                        </div>
                        <div className="font-display" style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
                          {inn.score}
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginLeft: '6px' }}>({inn.overs} ov, RR: {inn.runRate})</span>
                        </div>
                      </div>

                      {/* Batting Table */}
                      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>Batter</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>R</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>B</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>4s</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>6s</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>SR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inn.batStats && inn.batStats.filter(b => b.balls > 0).map((b, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: b.runs >= 50 ? '#fffbeb' : 'transparent' }}>
                                <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>
                                  {b.name}
                                  {b.runs >= 50 && <span style={{ marginLeft: '4px', fontSize: '9px', backgroundColor: '#f59e0b', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: '800' }}>{b.runs >= 100 ? '💯' : '🔥'}</span>}
                                  {b.out && <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', marginTop: '2px' }}>{b.howOut}</div>}
                                  {!b.out && <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600', marginLeft: '4px' }}>not out</span>}
                                </td>
                                <td style={{ textAlign: 'center', padding: '8px', fontWeight: '800', color: '#0f172a' }}>{b.runs}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: '#64748b' }}>{b.balls}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: '#0ea5e9', fontWeight: '600' }}>{b.fours}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: '#8b5cf6', fontWeight: '600' }}>{b.sixes}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: b.balls > 0 && (b.runs / b.balls * 100) >= 150 ? '#dc2626' : '#475569', fontWeight: '600' }}>
                                  {b.balls > 0 ? (b.runs / b.balls * 100).toFixed(1) : '0.0'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Bowling Table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>Bowler</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>O</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>R</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>W</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontWeight: '700', fontSize: '10px' }}>Econ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inn.bowlStats && inn.bowlStats.filter(b => b.balls > 0).map((b, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: b.wickets >= 3 ? '#f0fdf4' : 'transparent' }}>
                                <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>
                                  {b.name}
                                  {b.wickets >= 3 && <span style={{ marginLeft: '4px', fontSize: '9px', backgroundColor: '#16a34a', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: '800' }}>🎯</span>}
                                </td>
                                <td style={{ textAlign: 'center', padding: '8px', color: '#64748b' }}>{b.oversDisplay || b.overs}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: '#64748b' }}>{b.runs}</td>
                                <td style={{ textAlign: 'center', padding: '8px', fontWeight: '800', color: b.wickets >= 3 ? '#16a34a' : '#0f172a' }}>{b.wickets}</td>
                                <td style={{ textAlign: 'center', padding: '8px', color: b.overs > 0 && (b.runs / Math.max(1, b.balls / 6)) > 10 ? '#dc2626' : '#475569', fontWeight: '600' }}>
                                  {b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(1) : '0.0'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Commentary View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[selectedMatch.result.innings1, selectedMatch.result.innings2].map((inn, innIdx) => (
                    <div key={innIdx}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9' }}>
                        <TeamLogo teamId={inn.team} className="w-6 h-6" />
                        <span className="font-display" style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{inn.team} {inn.score}</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>{innIdx === 0 ? '1st Innings' : '2nd Innings (Chasing)'}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {inn.commentary && inn.commentary.map((ov, ovIdx) => (
                          <div key={ovIdx} style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: ov.events.length > 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${ov.events.length > 0 ? '#fde68a' : '#f1f5f9'}`, transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ov.events.length > 0 ? '8px' : 0 }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{ov.summary}</span>
                              <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', flexShrink: 0, marginLeft: '8px' }}>RR: {ov.runRate}</span>
                            </div>
                            {ov.events.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                                {ov.events.map((evt, ei) => (
                                  <div key={ei} style={{ fontSize: '11px', color: evt.includes('WICKET') ? '#dc2626' : (evt.includes('SIX') ? '#7c3aed' : (evt.includes('FOUR') ? '#0ea5e9' : '#475569')), fontWeight: evt.includes('WICKET') ? '700' : '500', paddingLeft: '12px', borderLeft: `2px solid ${evt.includes('WICKET') ? '#dc2626' : (evt.includes('SIX') ? '#8b5cf6' : (evt.includes('FOUR') ? '#0ea5e9' : '#e2e8f0'))}` }}>
                                    {evt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CAREER PROFILE HUB MODAL ─── */}
      {selectedPlayerProfile && (
        <div 
          className="animate-fadeIn"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setSelectedPlayerProfile(null)}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-fadeInUp"
            style={{ position: 'relative', width: '100%', maxWidth: '820px', maxHeight: '85vh', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {renderPlayerAvatar(selectedPlayerProfile, "w-16 h-16")}
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{selectedPlayerProfile.name}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                    <span>{selectedPlayerProfile.role}</span>
                    <span>•</span>
                    <span>{selectedPlayerProfile.country}</span>
                    <span>•</span>
                    <span style={{ color: '#059669', backgroundColor: '#e6fffa', padding: '2px 8px', borderRadius: '6px' }}>{selectedPlayerProfile.sold_to} squad</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                    Rating: {selectedPlayerProfile.rating}
                  </div>
                  {evolvedPlayers[selectedPlayerProfile.id]?.ratingBoost > 0 && (
                    <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: '800', marginTop: '2px' }}>
                      🔥 +{evolvedPlayers[selectedPlayerProfile.id].ratingBoost} Trained Boost
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedPlayerProfile(null)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} style={{ color: '#64748b' }} />
                </button>
              </div>
            </div>

            {/* Scrollable Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }} className="custom-scroll">
              
              {/* Aggregated Season Stats */}
              {(() => {
                const stats = playerStats[selectedPlayerProfile.name] || {
                  matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, highScore: 0, bestBowlWickets: 0, bestBowlRuns: 0, fifties: 0, hundreds: 0, wickets3: 0, mvpScore: 0, matchLog: []
                };

                const batSR = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
                const batAvg = stats.matches > 0 ? (stats.runs / Math.max(1, stats.matches - stats.matchLog.filter(l => l.type === 'batting' && !l.out).length)).toFixed(1) : '0.0';
                const bowlEcon = stats.ballsBowled > 0 ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2) : '0.00';
                const bowlOvers = (stats.ballsBowled / 6).toFixed(0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Stat Cards Grid */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>SEASON STATS SUMMARY</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>MATCHES</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{stats.matches}</div>
                        </div>

                        {selectedPlayerProfile.role !== 'Bowler' && (
                          <>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>RUNS</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{stats.runs}</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>STRIKE RATE</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>{batSR}</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>HIGH SCORE</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{stats.highScore}{stats.matchLog.some(l => l.runs === stats.highScore && !l.out) ? '*' : ''}</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>50s / 100s</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#d97706', marginTop: '2px' }}>{stats.fifties} / {stats.hundreds}</div>
                            </div>
                          </>
                        )}

                        {selectedPlayerProfile.role !== 'Batsman' && selectedPlayerProfile.role !== 'Wicketkeeper' && (
                          <>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>WICKETS</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>{stats.wickets}</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>ECONOMY</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb', marginTop: '2px' }}>{bowlEcon}</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>BEST BOWLING</div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{stats.bestBowlWickets}/{stats.bestBowlRuns !== 999 ? stats.bestBowlRuns : 0}</div>
                            </div>
                          </>
                        )}

                        <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #10b981', backgroundColor: '#ecfdf5' }}>
                          <div style={{ fontSize: '9px', color: '#047857', fontWeight: 'bold' }}>MVP SCORE</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#065f46', marginTop: '2px' }}>{stats.mvpScore.toFixed(0)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Match Logs table */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>MATCH-BY-MATCH LOG</h3>
                      
                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Opponent</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>Type</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>Runs (Balls)</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>4s / 6s</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>Overs</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>Wkts - Runs</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Wicket Outcome</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.matchLog.map((log, li) => (
                              <tr key={li} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0f172a' }}>vs {log.opponent}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>{log.type}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: log.runs >= 50 ? '#b45309' : '#0f172a' }}>
                                  {log.runs > 0 || log.balls > 0 ? `${log.runs} (${log.balls})` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>
                                  {log.runs > 0 ? `${log.fours} / ${log.sixes}` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>{log.oversBowled || '—'}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: log.wickets > 0 ? '#059669' : '#0f172a' }}>
                                  {log.oversBowled ? `${log.wickets} - ${log.runsConceded}` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b', fontStyle: log.out ? 'normal' : 'italic' }}>
                                  {log.runs > 0 || log.balls > 0 ? (log.out ? log.howOut : 'not out') : '—'}
                                </td>
                              </tr>
                            ))}
                            {stats.matchLog.length === 0 && (
                              <tr>
                                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No matches played yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SeasonDashboard;
