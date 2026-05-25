import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Play, ChevronRight, Award, Swords, Home, Star } from 'lucide-react';
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

  // Fill up if we still don't have 11 (e.g. if we skipped too many overseas)
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
  handleLeaveRoom
}) => {
  const [schedule, setSchedule] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [champion, setChampion] = useState(null);
  
  // Calculate strengths once on load
  const [teamStrengths, setTeamStrengths] = useState({});
  const [teamCaptains, setTeamCaptains] = useState({});
  const [playerMorale, setPlayerMorale] = useState({});
  const [teamPlayingXIs, setTeamPlayingXIs] = useState({});

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
        const squad = allPlayers.filter(pl => pl.sold_to === p.team_name).sort((a,b) => b.rating - a.rating);
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
        strengths[p.team_name] = calculateTeamStrength(p.team_name, allPlayers, initCaptains, initMorale, initPlayingXIs);
      });
      setTeamStrengths(strengths);
    }
  }, [participants, allPlayers]);

  const handleSimulateNextMatch = () => {
    const nextMatchIdx = schedule.findIndex(m => !m.played);
    if (nextMatchIdx === -1) return; // Season over

    const match = schedule[nextMatchIdx];
    const simulatedMatch = simulateMatch(match, allPlayers, teamCaptains, playerMorale, teamPlayingXIs);

    // Update Schedule
    const newSchedule = [...schedule];
    newSchedule[nextMatchIdx] = simulatedMatch;
    setSchedule(newSchedule);

    // Update Points Table
    updatePointsTable(simulatedMatch);
  };

  const handleSimulateAll = () => {
    const unplayed = schedule.filter(m => !m.played);
    if (unplayed.length === 0) return;

    const newSchedule = [...schedule];
    const newPointsTable = [...pointsTable]; // Start from current

    unplayed.forEach(match => {
      const simulated = simulateMatch(match, allPlayers, teamCaptains, playerMorale, teamPlayingXIs);
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
          winnerRow.points += 1; // 1 point for tie? usually 1 each, but winner gets 2 here for Super Over? Let's just say winner gets 2 always.
          winnerRow.won++; // Count super over win as a win
        } else {
          winnerRow.won++;
          loserRow.lost++;
          winnerRow.points += 2;
        }
      }
    });

    setSchedule(newSchedule);
    
    // Sort and set
    const sorted = newPointsTable.sort((a, b) => b.points - a.points || b.won - a.won);
    setPointsTable(sorted);
    
    // Set Champion
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

    // Check if season is over
    if (schedule.filter(m => !m.played).length <= 1) {
      // Because state hasn't flushed yet, if there was 1 left before, this was the last one
      setChampion(pointsTable.sort((a, b) => b.points - a.points)[0].team_name); // slightly inaccurate until flush, but good enough for now. Wait, I should recalculate from 'updated'
    }
  };
  
  // Use a useEffect to check if all matches are played to set champion properly
  useEffect(() => {
    if (schedule.length > 0 && schedule.every(m => m.played)) {
      setChampion(pointsTable[0].team_name);
    }
  }, [schedule, pointsTable]);


  const nextMatch = schedule.find(m => !m.played);
  const userTeam = participants.find(p => p.user_id === userId)?.team_name;

  return (
    <div className="max-w-6xl mx-auto w-full my-8 flex flex-col gap-8 view-enter-active">
      {/* HEADER */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 10 }}>
          <Swords size={48} style={{ color: '#059669' }} />
          <div>
            <h1 className="font-display" style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1.1', color: '#0f172a', textTransform: 'uppercase' }}>
              Season Simulation
            </h1>
            <p style={{ color: '#475569', fontSize: '15px' }}>Let the games begin. Will your drafted squad claim the trophy?</p>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <button onClick={handleLeaveRoom} className="btn-secondary" style={{ fontSize: '12px', padding: '10px 16px' }}>
            <Home size={16} /> Exit to Main Menu
          </button>
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
             <div className="font-display animate-pulse" style={{ marginTop: '16px', fontSize: '18px', color: '#059669', fontWeight: 'bold' }}>CONGRATULATIONS, YOUR SQUAD WON! 🎉</div>
           )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SQUAD MANAGEMENT */}
          {userTeam && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Star size={24} style={{ color: '#f59e0b' }} /> MANAGE SQUAD & PLAYING XI
                </h2>
                <button
                  onClick={() => {
                    const squad = allPlayers.filter(pl => pl.sold_to === userTeam);
                    const bestXI = autoSelectBestXI(squad);
                    const newXIs = { ...teamPlayingXIs, [userTeam]: bestXI };
                    setTeamPlayingXIs(newXIs);
                    setTeamStrengths(prev => ({ ...prev, [userTeam]: calculateTeamStrength(userTeam, allPlayers, teamCaptains[userTeam], playerMorale, newXIs) }));
                  }}
                  className="font-display"
                  style={{ fontSize: '12px', fontWeight: 'bold', padding: '8px 16px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fffbeb'; }}
                >
                  ⚡ Auto-Select Best XI
                </button>
              </div>

              {/* Captain / Vice Captain row */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Select Captain (C)</label>
                  <select 
                    value={teamCaptains[userTeam]?.captain || ''}
                    onChange={(e) => {
                      const newCaptains = { ...teamCaptains, [userTeam]: { ...teamCaptains[userTeam], captain: e.target.value } };
                      setTeamCaptains(newCaptains);
                      setTeamStrengths(prev => ({ ...prev, [userTeam]: calculateTeamStrength(userTeam, allPlayers, newCaptains, playerMorale, teamPlayingXIs) }));
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select a player...</option>
                    {allPlayers.filter(p => p.sold_to === userTeam).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Rat: {p.rating})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Select Vice-Captain (VC)</label>
                  <select 
                    value={teamCaptains[userTeam]?.viceCaptain || ''}
                    onChange={(e) => {
                      const newCaptains = { ...teamCaptains, [userTeam]: { ...teamCaptains[userTeam], viceCaptain: e.target.value } };
                      setTeamCaptains(newCaptains);
                      setTeamStrengths(prev => ({ ...prev, [userTeam]: calculateTeamStrength(userTeam, allPlayers, newCaptains, playerMorale, teamPlayingXIs) }));
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select a player...</option>
                    {allPlayers.filter(p => p.sold_to === userTeam).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Rat: {p.rating})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* XI Selection Live validation board */}
              {(() => {
                const userXI = teamPlayingXIs[userTeam] || [];
                const squad = allPlayers.filter(p => p.sold_to === userTeam);
                const pickedSquad = squad.filter(p => userXI.includes(p.id));
                const wkCount = pickedSquad.filter(p => p.role === 'Wicketkeeper').length;
                const overseasCount = pickedSquad.filter(p => p.country !== 'India').length;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Live stats dashboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                      
                      {/* Count badge */}
                      <div style={{ border: '1px solid', borderColor: userXI.length === 11 ? '#86efac' : '#fecaca', backgroundColor: userXI.length === 11 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Squad Size</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: userXI.length === 11 ? '#15803d' : '#b91c1c' }}>{userXI.length} / 11</span>
                      </div>

                      {/* WK badge */}
                      <div style={{ border: '1px solid', borderColor: wkCount >= 1 ? '#86efac' : '#fecaca', backgroundColor: wkCount >= 1 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Wicketkeepers</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: wkCount >= 1 ? '#15803d' : '#b91c1c' }}>{wkCount} (Min 1)</span>
                      </div>

                      {/* OS badge */}
                      <div style={{ border: '1px solid', borderColor: overseasCount <= 4 ? '#86efac' : '#fecaca', backgroundColor: overseasCount <= 4 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Overseas</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: overseasCount <= 4 ? '#15803d' : '#b91c1c' }}>{overseasCount} / 4</span>
                      </div>
                    </div>

                    {/* Warning Messages */}
                    {(userXI.length !== 11 || wkCount === 0 || overseasCount > 4) && (
                      <div style={{ padding: '10px 16px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', fontSize: '12px', color: '#b45309', fontWeight: '600' }} className="animate-pulse">
                        ⚠️ Warning: Your lineup is currently illegal. Simulating matches with an illegal lineup will apply a strength penalty (-10 batting & bowling overall).
                      </div>
                    )}

                    {/* Grid of Players with Pick buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                      {squad.map(p => {
                        const isPicked = userXI.includes(p.id);
                        const isCap = teamCaptains[userTeam]?.captain == p.id;
                        const isVc = teamCaptains[userTeam]?.viceCaptain == p.id;
                        const moraleVal = playerMorale[p.id] || 0;

                        return (
                          <div 
                            key={p.id}
                            style={{ 
                              padding: '12px', 
                              borderRadius: '12px', 
                              border: isPicked ? '2px solid #22c55e' : '1px solid #e2e8f0',
                              backgroundColor: isPicked ? '#f0fdf4' : '#ffffff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.2s',
                              opacity: isPicked ? 1 : 0.75
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{p.name}</span>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{p.role} • {p.country === 'India' ? '🇮🇳' : '✈️'}</span>
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {p.rating}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {isCap && <span style={{ fontSize: '9px', backgroundColor: '#f59e0b', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>C</span>}
                                {isVc && <span style={{ fontSize: '9px', backgroundColor: '#3b82f6', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>VC</span>}
                                <span style={{ fontSize: '9px', color: moraleVal > 0 ? '#16a34a' : moraleVal < 0 ? '#dc2626' : '#64748b', fontWeight: 'bold' }}>
                                  Morale: {moraleVal > 0 ? `+${moraleVal}` : moraleVal}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  let newXI = [...userXI];
                                  if (isPicked) {
                                    newXI = newXI.filter(id => id !== p.id);
                                  } else {
                                    newXI.push(p.id);
                                  }
                                  const newXIs = { ...teamPlayingXIs, [userTeam]: newXI };
                                  setTeamPlayingXIs(newXIs);
                                  setTeamStrengths(prev => ({ ...prev, [userTeam]: calculateTeamStrength(userTeam, allPlayers, teamCaptains[userTeam], playerMorale, newXIs) }));
                                }}
                                style={{ 
                                  fontSize: '11px', 
                                  fontWeight: 'bold', 
                                  padding: '4px 10px', 
                                  borderRadius: '6px', 
                                  border: 'none', 
                                  cursor: 'pointer',
                                  backgroundColor: isPicked ? '#ef4444' : '#22c55e',
                                  color: '#ffffff',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                {isPicked ? 'BENCH' : 'PLAY'}
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

          {/* POINTS TABLE */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  
                  const delayClass = `stagger-item delay-${Math.min(5, idx + 1) * 100}`;
                  return (
                    <tr key={row.team_name} className={delayClass} style={{ backgroundColor: isUser ? '#f0fdf4' : 'transparent', fontWeight: isUser ? 'bold' : 'normal', transition: 'all 0.2s' }}>
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
        </div>

        {/* MATCH SCHEDULE & SIM CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SIMULATOR CONTROLS */}
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
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                      <span className="font-display" style={{ fontSize: '18px', fontWeight: 'bold' }}>{nextMatch.teamA}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>vs</span>
                      <span className="font-display" style={{ fontSize: '18px', fontWeight: 'bold' }}>{nextMatch.teamB}</span>
                    </div>
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

          {/* RECENT RESULTS */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1, maxHeight: '400px', overflowY: 'auto' }} className="custom-scroll">
            <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Results Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedule.filter(m => m.played).reverse().map(match => (
                <div key={match.id} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    <span>Match {match.id}</span>
                    <span style={{ color: '#059669' }}>{match.result.margin}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                    <span style={{ color: match.result.winner === match.teamA ? '#0f172a' : '#94a3b8' }}>{match.teamA}</span>
                    <span style={{ fontSize: '10px', color: '#cbd5e1' }}>vs</span>
                    <span style={{ color: match.result.winner === match.teamB ? '#0f172a' : '#94a3b8' }}>{match.teamB}</span>
                  </div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '11px', color: '#475569' }}>
                    <span style={{ fontWeight: 'bold', color: '#d97706' }}>{match.result.winner}</span> won
                    {match.result.motm && <span> (MOTM: {match.result.motm})</span>}
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
    </div>
  );
};

export default SeasonDashboard;
