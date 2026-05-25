import React, { useState } from 'react';
import { Trophy, CheckCircle, Plus, Play, Users, AlertTriangle, X } from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import { FRANCHISES } from '../utils/constants';

const LandingPage = ({
  gameMode,
  setGameMode,
  supabaseConnected,
  userName,
  setUserName,
  selectedSets,
  setSelectedSets,
  timerDuration,
  setTimerDuration,
  expectedPlayers,
  setExpectedPlayers,
  selectedTeam,
  setSelectedTeam,
  selectedBotTeams,
  setSelectedBotTeams,
  roomCode,
  setRoomCode,
  handleJoinRoomOnline,
  handleCreateRoomOnline,
  handleCreateRoomOffline
}) => {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 my-8 items-stretch view-enter-active">
      {/* Left side info */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Trophy size={56} style={{ color: '#d97706', marginBottom: '24px' }} />
          <h1 className="font-display" style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px', lineHeight: '1.1', color: '#0f172a', textTransform: 'uppercase' }}>
            Assemble Your <br /><span style={{ color: '#d97706' }}>Dream IPL Squad</span>
          </h1>
          <p style={{ color: '#475569', fontSize: '16px', marginBottom: '32px', lineHeight: '1.6' }}>
            Manage finances, bid strategically against bots or live players, and build a high-performance squad under standard IPL salary cap and team composition limits.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px', color: '#334155', fontWeight: '500' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={20} style={{ color: '#059669' }} />
              <span>₹120 Crore budget cap</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={20} style={{ color: '#059669' }} />
              <span>Real 2025/2026 player star pool</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={20} style={{ color: '#059669' }} />
              <span>Real-time multiplayer database synchronization</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={20} style={{ color: '#059669' }} />
              <span>Smart AI bidding agents (Sandbox mode)</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px', position: 'relative', zIndex: 10 }}>
          <button onClick={() => setActiveModal('rules')} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#d97706', fontWeight: 'bold', textDecoration: 'underline', padding: 0 }}>View Game Rules</button>
          <button onClick={() => setActiveModal('privacy')} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', padding: 0 }}>Privacy Policy</button>
          <button onClick={() => setActiveModal('terms')} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', padding: 0 }}>Terms of Use</button>
          <div style={{ flexBasis: '100%', fontSize: '11px', marginTop: '8px', color: '#94a3b8' }}>Created with React, Vite, and Supabase.</div>
        </div>
      </div>

      {/* Right side form */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '32px', color: '#0f172a', letterSpacing: '0.05em' }}>GET STARTED</h2>
          
          {/* Mode Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '32px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setGameMode('offline')}
              style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s', backgroundColor: gameMode === 'offline' ? '#ffffff' : 'transparent', color: gameMode === 'offline' ? '#d97706' : '#64748b', boxShadow: gameMode === 'offline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}
            >
              Local Sandbox
            </button>
            <button 
              onClick={() => {
                if (!supabaseConnected) {
                  alert("Supabase keys are not set up or configured. Running in Local Sandbox instead.");
                  return;
                }
                setGameMode('online');
              }}
              style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: gameMode === 'online' ? '#ffffff' : 'transparent', color: gameMode === 'online' ? '#d97706' : '#64748b', boxShadow: gameMode === 'online' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}
            >
              Online Multiplayer
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Name field */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager Name</label>
              <input 
                type="text" 
                placeholder="Enter your name" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '14px 16px', borderRadius: '10px', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={(e) => e.target.style.borderColor = '#d97706'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            {/* Sets Selection */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Auction Sets</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setSelectedSets([1,2,3,4,5,6,7,8])} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>Select All</button>
                  <button onClick={() => setSelectedSets([])} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Clear All</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {[1,2,3,4,5,6,7,8].map(s => {
                  const details = {
                    1: { title: 'Marquee Batters', roles: 'Top Order & Power Hitters' },
                    2: { title: 'Elite All-Rounders', roles: 'Pace & Spin All-Rounders' },
                    3: { title: 'Wicketkeepers', roles: 'Glovesmen & Finishers' },
                    4: { title: 'Fast Bowlers', roles: 'Pace & Death Overs' },
                    5: { title: 'Spinners', roles: 'Mystery & Wrist Spin' },
                    6: { title: 'Uncapped Stars', roles: 'Emerging Domestic Talent' },
                    7: { title: 'Accelerated I', roles: 'Mixed Roles (Base 50L)' },
                    8: { title: 'Accelerated II', roles: 'Mixed Roles (Base 20L)' }
                  }[s];

                  return (
                  <div 
                    key={s}
                    onClick={() => {
                      if (selectedSets.includes(s) && selectedSets.length > 1) {
                        setSelectedSets(selectedSets.filter(x => x !== s));
                      } else if (!selectedSets.includes(s)) {
                        setSelectedSets([...selectedSets, s].sort());
                      }
                    }}
                    style={{
                      padding: '10px 12px', textAlign: 'left', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                      backgroundColor: selectedSets.includes(s) ? '#fffbeb' : '#ffffff',
                      color: selectedSets.includes(s) ? '#d97706' : '#475569',
                      border: selectedSets.includes(s) ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      display: 'flex', flexDirection: 'column', gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Set {s}: {details.title}</span>
                      {selectedSets.includes(s) && <CheckCircle size={14} style={{ color: '#d97706' }} />}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: selectedSets.includes(s) ? '#b45309' : '#64748b' }}>
                      Roles: {details.roles}
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Bid Timer Duration */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bid Timer</label>
              <select 
                value={timerDuration}
                onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '14px 16px', borderRadius: '10px', fontSize: '15px', outline: 'none', cursor: 'pointer', appearance: 'none' }}
              >
                <option value={10}>10 Seconds (Fast)</option>
                <option value={15}>15 Seconds (Standard)</option>
                <option value={20}>20 Seconds</option>
                <option value={25}>25 Seconds</option>
                <option value={30}>30 Seconds (Slow)</option>
              </select>
            </div>

            {gameMode === 'online' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Real Players (Max 10)</label>
                <input 
                  type="number" 
                  min="1" max="10"
                  value={expectedPlayers} 
                  onChange={(e) => setExpectedPlayers(parseInt(e.target.value) || 2)} 
                  style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '14px 16px', borderRadius: '10px', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                  onFocus={(e) => e.target.style.borderColor = '#d97706'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            )}

            {/* Franchise choice */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Your Franchise</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {FRANCHISES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedTeam(f.id)}
                    className={`premium-btn-bounce ${f.id.toLowerCase()}-glow`}
                    style={{ padding: '10px 4px', borderRadius: '10px', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: selectedTeam === f.id ? '2px solid #f59e0b' : '1px solid #e2e8f0', backgroundColor: selectedTeam === f.id ? '#fffbeb' : '#f8fafc', color: selectedTeam === f.id ? '#b45309' : '#64748b', transform: selectedTeam === f.id ? 'scale(1.05)' : 'scale(1)', boxShadow: selectedTeam === f.id ? '0 4px 12px rgba(245, 158, 11, 0.2)' : 'none' }}
                    title={f.name}
                  >
                    <TeamLogo teamId={f.id} className="w-10 h-10 mx-auto mb-2" />
                    <span style={{ fontSize: '11px', letterSpacing: '0.05em' }}>{f.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {gameMode === 'offline' && selectedTeam && (
              <div style={{ paddingTop: '20px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Select Opponent Bots ({selectedBotTeams.filter(t => t !== selectedTeam).length} Selected)</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>Max 9</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {FRANCHISES.filter(f => f.id !== selectedTeam).map(f => {
                    const isSelected = selectedBotTeams.includes(f.id);
                    return (
                      <button
                        key={`bot-${f.id}`}
                        onClick={() => {
                          setSelectedBotTeams(prev => 
                            prev.includes(f.id) ? prev.filter(t => t !== f.id) : [...prev, f.id]
                          );
                        }}
                        className={`premium-btn-bounce ${f.id.toLowerCase()}-glow`}
                        style={{ padding: '8px 4px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: isSelected ? '2px solid #94a3b8' : '1px dashed #cbd5e1', backgroundColor: isSelected ? '#f8fafc' : '#ffffff', opacity: isSelected ? 1 : 0.5 }}
                        title={`${isSelected ? 'Remove' : 'Add'} ${f.name} Bot`}
                      >
                        <TeamLogo teamId={f.id} className="w-8 h-8 mx-auto mb-1" style={{ filter: isSelected ? 'none' : 'grayscale(100%)' }} />
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: isSelected ? '#334155' : '#94a3b8' }}>{f.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {gameMode === 'online' && (
              <div style={{ paddingTop: '20px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Code (To Join)</label>
                <input 
                  type="text" 
                  placeholder="ENTER 6-CHARACTER CODE" 
                  value={roomCode} 
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())} 
                  style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px dashed #94a3b8', color: '#d97706', padding: '16px', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', outline: 'none', textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#d97706'}
                  onBlur={(e) => e.target.style.borderColor = '#94a3b8'}
                  maxLength={6}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: gameMode === 'online' ? '1fr 1fr' : '1fr', gap: '16px', marginTop: '40px' }}>
          {gameMode === 'online' ? (
            <>
              <button 
                onClick={handleJoinRoomOnline} 
                disabled={!userName || !selectedTeam || !roomCode}
                className="btn-secondary"
                style={{ justifyContent: 'center', padding: '16px', fontSize: '14px', borderRadius: '12px' }}
              >
                JOIN LOBBY <Users size={18} />
              </button>
              <button 
                onClick={handleCreateRoomOnline} 
                disabled={!userName || !selectedTeam}
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '16px', fontSize: '14px', borderRadius: '12px' }}
              >
                CREATE ROOM <Plus size={18} />
              </button>
            </>
          ) : (
            <button 
              onClick={handleCreateRoomOffline} 
              disabled={!userName || !selectedTeam}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '16px', fontSize: '15px', borderRadius: '12px' }}
            >
              START SIMULATOR <Play size={20} />
            </button>
          )}
        </div>

        {!supabaseConnected && (
          <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex gap-2 items-start">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <span className="text-[10px] text-slate-400 leading-normal">
              Real-time online mode requires Supabase credentials in your project's `.env.local` file. Currently playing in local Sandbox Mode.
            </span>
          </div>
        )}
      </div>

      {/* Modals for Legal / Rules */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'all 0.3s ease-in-out' }}>
          <div className="animate-scaleIn" style={{ backgroundColor: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="font-display" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0, letterSpacing: '0.05em' }}>
                {activeModal === 'rules' ? 'OFFICIAL GAME RULES' : activeModal === 'privacy' ? 'PRIVACY POLICY' : 'TERMS OF USE'}
              </h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={24} style={{ color: '#64748b' }} />
              </button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
              {activeModal === 'rules' && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>1. Bidding & Budgets</h3>
                  <p style={{ marginBottom: '16px' }}>Each franchise begins with a purse of ₹120 Crore. Bids increment automatically according to official IPL slabs (e.g. 20L steps, 50L steps, 1Cr steps). You cannot bid if you have insufficient funds to complete a minimum squad of 18 players.</p>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>2. Squad Composition</h3>
                  <p style={{ marginBottom: '16px' }}>Your squad must have a minimum of 18 players and a maximum of 25 players. You may only have a maximum of 8 overseas players in your final squad. Failure to meet these conditions results in an invalid squad.</p>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>3. Auction Sets</h3>
                  <p style={{ marginBottom: '16px' }}>Players are categorized into sets based on their primary role (Marquee, Batsmen, Bowlers, etc.). The auctioneer (host) dictates which sets are auctioned and in what order.</p>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>4. Tie-Breakers & Winning</h3>
                  <p>The winner is determined by the highest "Squad Rating" at the end of the auction, which is an average of the individual ratings of all valid players purchased.</p>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Data Collection & Usage</h3>
                  <p style={{ marginBottom: '16px' }}>We respect your privacy. In this application, data collected (such as Manager Names, Room Codes, and Bidding History) is temporarily stored via Supabase for the purpose of facilitating real-time multiplayer functionality. We do not sell or share this data with third-party advertisers.</p>
                  <p style={{ marginBottom: '16px' }}>In Local Sandbox mode, all data is processed strictly within your local browser's memory and is not transmitted externally.</p>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Data Retention</h3>
                  <p>Active rooms and participant data are routinely purged from our cloud servers to minimize footprint. If you have concerns, please host your own local instance.</p>
                </div>
              )}

              {activeModal === 'terms' && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Acceptance of Terms</h3>
                  <p style={{ marginBottom: '16px' }}>By using this IPL Auction Simulator, you agree to play fairly and not abuse the real-time multiplayer infrastructure. This is a community-driven project built for entertainment purposes.</p>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Intellectual Property</h3>
                  <p style={{ marginBottom: '16px' }}>All player names, franchise logos, and likenesses used in this application belong to their respective rightful owners. This is an unofficial simulation game and is not affiliated with the BCCI or IPL.</p>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Limitations of Liability</h3>
                  <p>The creators of this app are not responsible for any disputes, damages, or issues arising from the use of the platform. Use at your own risk.</p>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)} className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>I Understand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
