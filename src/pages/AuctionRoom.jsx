import React from 'react';
import { RefreshCw, Pause, Play, SkipForward, Settings, Send } from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import LivePurses from '../components/LivePurses';
import { FRANCHISES } from '../utils/constants';

const AuctionRoom = ({
  roomState,
  roomPlayers,
  participants,
  selectedTeam,
  timeLeft,
  timerDuration,
  gavelStrike,
  gameMode,
  isHost,
  offlinePlayers,
  comments,
  commentInput,
  setCommentInput,
  showRosterTeam,
  setShowRosterTeam,
  getNextBidAmount,
  getTeamSquadCount,
  getOverseasCount,
  handlePlaceBidOnline,
  handlePlaceBidOffline,
  handleHostControlOnline,
  handleHostControlOffline,
  handleSendComment,
  rtmState,
  rtmCards,
  handleRtmDecision,
  getPreviousTeam
}) => {
  return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-start">
            
            {/* Top row: Active Bid Area (Spans full width) */}
            <div className="lg:col-span-3">
              
              {/* CURRENT PLAYER CARD */}
              {(() => {
                if (rtmState && rtmState.isActive) {
                  const player = rtmState.player;
                  const finalBid = rtmState.finalBid;
                  const previousTeam = rtmState.previousTeam;
                  const finalBidder = rtmState.finalBidder;
                  const isMyRTM = previousTeam === selectedTeam;
                  
                  const prevTeamInfo = FRANCHISES.find(f => f.id === previousTeam);
                  const bidderInfo = FRANCHISES.find(f => f.id === finalBidder);
                  
                  const rtmTimerPercentage = (rtmState.timeLeft / 12) * 100;
                  const rtmCardsLeft = rtmCards[previousTeam] || 0;

                  return (
                    <div 
                      key="rtm-panel"
                      className="glass-panel p-6 relative overflow-hidden flex flex-col justify-between min-h-[460px] active-bidder-glow animate-pulse"
                      style={{ border: '3px solid #f59e0b', boxShadow: '0 0 25px rgba(245,158,11,0.25)', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', color: '#ffffff', borderRadius: '16px' }}
                    >
                      {/* Top banner */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f59e0b', margin: '-24px -24px 20px -24px', padding: '12px 24px', borderBottom: '1px solid #d97706', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <span className="font-display" style={{ color: '#1e1b4b', fontWeight: '900', fontSize: '14px', letterSpacing: '0.1em' }}>🚨 RIGHT TO MATCH (RTM) DECISION</span>
                        <span className="font-display w-16 text-right" style={{ color: '#1e1b4b', fontWeight: '900', fontSize: '14px' }}>{rtmState.timeLeft}s</span>
                      </div>

                      {/* Animated progress bar */}
                      <div style={{ width: 'calc(100% + 48px)', height: '4px', backgroundColor: '#334155', margin: '-20px -24px 24px -24px' }}>
                        <div style={{ height: '100%', backgroundColor: '#f59e0b', width: `${rtmTimerPercentage}%`, transition: 'width 1s linear' }} />
                      </div>

                      {/* Main comparison layout */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '12px 0', textAlign: 'center' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>PLAYER UP FOR RTM</h4>
                        <h2 className="font-display text-white animate-fadeIn" style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                          {player.name}
                        </h2>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginBottom: '24px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', backgroundColor: '#1e293b', color: '#cbd5e1', borderRadius: '8px', border: '1px solid #334155' }}>{player.role}</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', backgroundColor: '#1e293b', color: '#cbd5e1', borderRadius: '8px', border: '1px solid #334155' }}>{player.country === 'India' ? '🇮🇳 INDIAN' : '✈️ OVERSEAS'}</span>
                        </div>

                        {/* RTM Duel details */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '600px', backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '16px', border: '1px solid #334155', backdropFilter: 'blur(8px)' }} className="animate-fadeInUp">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Winning Bidder</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', padding: '4px 12px', backgroundColor: bidderInfo?.color, color: bidderInfo?.text, borderRadius: '6px' }}>{finalBidder}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Final Bid Price</span>
                            <span className="font-display" style={{ fontSize: '28px', fontWeight: '900', color: '#34d399' }}>₹{finalBid} Cr</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Previous Team</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', padding: '4px 12px', backgroundColor: prevTeamInfo?.color, color: prevTeamInfo?.text, borderRadius: '6px' }}>{previousTeam}</span>
                          </div>
                        </div>
                      </div>

                      {/* Decision Options */}
                      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
                        {isMyRTM ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fadeIn">
                            <div style={{ textAlign: 'center', color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>
                              👉 You have {rtmCardsLeft} RTM card{rtmCardsLeft !== 1 ? 's' : ''} left. Do you want to match the ₹{finalBid} Cr bid to retain {player.name}?
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                              <button
                                onClick={() => handleRtmDecision(true)}
                                className="flex-1 font-display uppercase tracking-wider py-4 rounded-xl font-bold cursor-pointer border-none transition premium-btn-bounce"
                                style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b)', color: '#0f172a', boxShadow: '0 4px 12px rgba(245,158,11,0.3)', fontSize: '16px' }}
                              >
                                Match Bid (₹{finalBid} Cr)
                              </button>
                              <button
                                onClick={() => handleRtmDecision(false)}
                                className="flex-1 font-display uppercase tracking-wider py-4 rounded-xl font-bold cursor-pointer transition"
                                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '16px' }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.color = '#ffffff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.color = '#cbd5e1'; }}
                              >
                                Decline RTM
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px' }}>
                            <RefreshCw size={24} className="animate-spin text-amber-500" />
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24', textAlign: 'center' }}>
                              ⌛ {previousTeam} Bot is deciding whether to match the bid and retain {player.name}...
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              ({rtmCardsLeft} RTM cards remaining for {previousTeam})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                const currentPlayer = roomPlayers.find(p => p.player_id === roomState.current_player_id || p.id === roomState.current_player_id);
                if (!currentPlayer) {
                  return (
                    <div className="glass-panel p-16 text-center text-slate-400 flex flex-col items-center justify-center">
                      <RefreshCw size={48} className="animate-spin text-amber-500 mb-4" />
                      <h3 className="text-2xl font-bold font-display text-white">AUCTION RE-CONNECTING...</h3>
                      <p className="text-sm">Fetching synchronized real-time data</p>
                    </div>
                  );
                }

                // Calculate next bid
                const nextBidPrice = getNextBidAmount(roomState.current_bid, currentPlayer.base_price);
                const currentBidderInfo = FRANCHISES.find(f => f.id === roomState.current_bidder);
                
                // Color formatting for role
                const getRoleBadgeClass = (role) => {
                  if (role === 'Batsman') return 'badge-batsman';
                  if (role === 'Bowler') return 'badge-bowler';
                  if (role === 'All-Rounder') return 'badge-ar';
                  return 'badge-wk';
                };

                const myBidderRecord = participants.find(p => p.team_name === selectedTeam);
                const oppBidderRecord = participants.find(p => p.team_name === roomState.current_bidder);
                const isUnderfunded = myBidderRecord && myBidderRecord.budget < nextBidPrice;
                const isHighestBidder = roomState.current_bidder === selectedTeam;

                // Timer percentage
                const isActiveOrPaused = roomState.status === 'active' || roomState.status === 'paused';
                const timerPercentage = isActiveOrPaused ? (timeLeft / timerDuration) * 100 : 0;

                return (
                  <div 
                    key={currentPlayer.id || currentPlayer.player_id}
                    className={`glass-panel p-6 relative overflow-hidden flex flex-col justify-between min-h-[460px] active-bidder-glow animate-flipInY ${currentPlayer.rating >= 90 ? 'marquee-luxury-card' : ''}`}
                  >
                    {/* Background accent ring */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                          <span style={{ backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }} className="animate-fadeIn">
                            {currentPlayer.set_name || `SET ${currentPlayer.set_index}`}
                          </span>
                          <h2 className="font-display text-reveal" style={{ fontSize: '48px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0f172a', margin: 0, lineHeight: 1 }}>
                            {currentPlayer.name}
                          </h2>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px' }} className="animate-fadeInUp">
                          {/* Role Box */}
                          <span style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '14px', letterSpacing: '0.1em', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            {currentPlayer.role}
                          </span>
                          
                          {/* Nationality Box */}
                          <span style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '14px', letterSpacing: '0.1em', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            {currentPlayer.country === 'India' ? '🇮🇳 INDIAN' : '✈️ OVERSEAS'}
                          </span>
                          
                          {/* Base Price Box */}
                          <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: '8px', overflow: 'hidden', border: '1px solid #f59e0b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <span style={{ padding: '6px 16px', backgroundColor: '#f59e0b', color: 'white', fontSize: '14px', letterSpacing: '0.1em', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
                              BASE
                            </span>
                            <span style={{ padding: '6px 16px', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em', display: 'flex', alignItems: 'center' }}>
                              ₹{currentPlayer.base_price} CR
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* LIVE BIDDING INFORMATION & PURSE */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', alignItems: 'stretch' }}>
                      
                      {/* 1. Current highest bidder */}
                      <div style={{ flex: '1 1 30%', minWidth: '250px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} className="animate-fadeIn">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Highest Bid</span>
                          {roomState.current_bid > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                              <span className="font-display bid-amount-pop" style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669', lineHeight: '1' }}>
                                ₹{roomState.current_bid} <span style={{fontSize:'16px', fontWeight:'700', color: '#047857'}}>Cr</span>
                              </span>
                              <span 
                                className="font-display badge-franchise-pill"
                                style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', backgroundColor: currentBidderInfo?.color, color: currentBidderInfo?.text, letterSpacing: '0.05em' }}
                              >
                                {roomState.current_bidder}
                              </span>
                            </div>
                          ) : (
                            <span className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                              No Bids Yet
                            </span>
                          )}
                        </div>
                        <div className={`${gavelStrike ? 'hammer-animation' : ''}`} style={{ fontSize: '40px', transformOrigin: 'bottom right' }}>
                          🔨
                        </div>
                      </div>

                      {/* 2. BIDDING BUTTON & TIMER */}
                      <div style={{ flex: '1 1 30%', minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                        {isActiveOrPaused ? (
                          <>
                            <button
                              onClick={gameMode === 'online' ? handlePlaceBidOnline : handlePlaceBidOffline}
                              disabled={roomState.status === 'paused' || isUnderfunded || isHighestBidder}
                              className={`w-full font-display uppercase tracking-wider transition border-none cursor-pointer premium-btn-bounce ${
                                roomState.status === 'paused'
                                  ? 'bg-amber-100 text-amber-600 border border-amber-200 cursor-not-allowed'
                                  : isHighestBidder 
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 cursor-not-allowed' 
                                    : isUnderfunded 
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-amber-500/20'
                              }`}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1, padding: '16px', borderRadius: '12px' }}
                            >
                              {roomState.status === 'paused' ? (
                                <>
                                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>AUCTION PAUSED</span>
                                  <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#b45309' }}>waiting for host to resume...</span>
                                </>
                              ) : isHighestBidder ? (
                                <>
                                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>YOU HOLD HIGH BID</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#34d399', textTransform: 'lowercase' }}>waiting for challengers...</span>
                                </>
                              ) : isUnderfunded ? (
                                <>
                                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>INSUFFICIENT BUDGET</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', textTransform: 'lowercase' }}>requires ₹{nextBidPrice} Cr</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '20px', fontWeight: 'bold' }}>PLACE BID</span>
                                  <span style={{ fontSize: '11px', fontWeight: 'normal', textTransform: 'lowercase', color: '#1e293b' }}>₹{nextBidPrice} Cr (+₹{(nextBidPrice - Math.max(roomState.current_bid, currentPlayer.base_price)).toFixed(2)} Cr)</span>
                                </>
                              )}
                            </button>
                            
                            {/* Timer Bar Below Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', padding: '0 4px' }}>
                              <span className={`text-xs font-bold font-display w-12 text-right ${roomState.status === 'paused' ? 'text-amber-500 animate-pulse' : timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                                {timeLeft}s {roomState.status === 'paused' && '⏸️'}
                              </span>
                              <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                <div 
                                  className={`h-full transition-all duration-200 ease-linear progress-timer-bar ${roomState.status === 'paused' ? 'paused' : timeLeft <= 5 ? 'warning' : ''}`}
                                  style={{ width: `${timerPercentage}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Injected Admin Game Controls */}
                            {isHost && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }} className="animate-fadeIn">
                                <button 
                                  onClick={() => gameMode === 'online' ? handleHostControlOnline('pause') : handleHostControlOffline('pause')} 
                                  disabled={roomState.status === 'paused'}
                                  className={`btn-secondary flex-1 font-bold transition-all duration-300 ${roomState.status === 'paused' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400'}`} 
                                  style={{ fontSize: '11px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  <Pause size={12} /> Pause
                                </button>
                                <button 
                                  onClick={() => gameMode === 'online' ? handleHostControlOnline('resume') : handleHostControlOffline('resume')} 
                                  disabled={roomState.status === 'active'}
                                  className={`btn-secondary flex-1 font-bold transition-all duration-300 ${roomState.status === 'active' ? 'opacity-40 cursor-not-allowed' : 'pulse-green-glow hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400'}`} 
                                  style={{ fontSize: '11px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  <Play size={12} /> Resume
                                </button>
                                <button 
                                  onClick={() => gameMode === 'online' ? handleHostControlOnline('skip') : handleHostControlOffline('skip')} 
                                  className="btn-secondary flex-1 font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-400" 
                                  style={{ fontSize: '11px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#dc2626' }}
                                >
                                  <SkipForward size={12} /> Force
                                </button>
                              </div>
                            )}
                          </>
                        ) : roomState.status === 'sold' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', padding: '16px' }} className="animate-scaleIn">
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#047857', letterSpacing: '0.05em', textTransform: 'uppercase' }}>PLAYER SOLD</span>
                            <span className="font-display" style={{ fontSize: '24px', fontWeight: 'bold', color: '#064e3b' }}>₹{roomState.current_bid} Cr</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>to {roomState.current_bidder}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#fef2f2', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px' }} className="animate-scaleIn">
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b91c1c', letterSpacing: '0.05em', textTransform: 'uppercase' }}>PLAYER UNSOLD</span>
                            <span style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>No bids received</span>
                          </div>
                        )}
                      </div>

                      {/* 3. LIVE PURSE (RIGHT SIDE) */}
                      <div style={{ flex: '1 1 30%', minWidth: '250px' }}>
                        <LivePurses 
                          selectedTeam={selectedTeam} 
                          participants={participants} 
                          roomState={roomState} 
                          allPlayers={gameMode === 'online' ? roomPlayers : offlinePlayers} 
                        />
                      </div>

                    </div>
                  </div>
                );
              })()}

              </div>

            {/* LIVE PURSE TICKER */}
            <div className="lg:col-span-3 glass-panel overflow-hidden py-3 px-0 border-l-4 border-l-amber-500" style={{ margin: '-12px 0 12px 0', backgroundColor: '#fffbeb', borderColor: '#f59e0b' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'scroll-ticker 25s linear infinite' }} className="ticker-wrapper">
                {participants.map((p, idx) => {
                  const activeBid = roomState.current_bidder === p.team_name ? roomState.current_bid : 0;
                  const currentPurse = (p.budget - activeBid).toFixed(2);
                  const squadCount = getTeamSquadCount(p.team_name);
                  const osCount = getOverseasCount(p.team_name);
                  return (
                    <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '0 24px', borderRight: '1px solid #fcd34d' }}>
                      <span className="font-display font-bold text-slate-800">{p.team_name}</span>
                      <span className="font-bold text-amber-700">₹{currentPurse} Cr</span>
                      <span className="text-xs text-amber-600 font-bold">({squadCount}/25, {osCount}/8 OS)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row - Left Column: Franchise Squad Board (Spans 2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* SQUAD BOARD / LEADERBOARD */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold font-display text-white mb-4">FRANCHISE BOARD</h3>
                
                <div className="space-y-3">
                  {participants.map((p, index) => {
                    const teamInfo = FRANCHISES.find(f => f.id === p.team_name);
                    const isUserTeam = p.team_name === selectedTeam;
                    const squadCount = getTeamSquadCount(p.team_name);
                    const overseasCount = getOverseasCount(p.team_name);
                    
                    const teamSquad = roomPlayers.filter(player => player.sold_to === p.team_name);
                    const batCount = teamSquad.filter(player => player.role === 'Batsman').length;
                    const bowlCount = teamSquad.filter(player => player.role === 'Bowler').length;
                    const arCount = teamSquad.filter(player => player.role === 'All-Rounder').length;
                    const wkCount = teamSquad.filter(player => player.role === 'Wicketkeeper').length;

                    const delayClass = `stagger-item delay-${Math.min(5, index + 1) * 100}`;

                    return (
                      <div 
                        key={p.id} 
                        className={`glass-card hover:-translate-y-1 hover:shadow-md ${delayClass}`}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: isUserTeam ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: isUserTeam ? '0 4px 6px -1px rgba(245, 158, 11, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {/* Top row: Logo, Name, Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', padding: '6px', border: '1px solid #f1f5f9' }}>
                               <TeamLogo teamId={teamInfo?.id} style={{ width: '100%', height: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                                {p.user_name}
                                {isUserTeam && <span style={{ fontSize: '9px', backgroundColor: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.05em' }}>YOU</span>}
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', letterSpacing: '0.05em' }}>{batCount} BAT</span>
                                <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#f3e8ff', color: '#7e22ce', borderRadius: '4px', letterSpacing: '0.05em' }}>{wkCount} WK</span>
                                <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '4px', letterSpacing: '0.05em' }}>{arCount} AR</span>
                                <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', letterSpacing: '0.05em' }}>{bowlCount} BOWL</span>
                              </div>
                            </div>
                          </div>
                          
                          <span 
                            style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px', backgroundColor: teamInfo?.color, color: teamInfo?.text, letterSpacing: '0.05em' }}
                          >
                            {p.team_name}
                          </span>
                        </div>

                        {/* Bottom row: Stats */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Budget</span>
                            <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>₹{p.budget} <span style={{fontSize:'12px', fontWeight:'700', color: '#475569'}}>Cr</span></span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Squad</span>
                            <span style={{ fontWeight: '800', fontSize: '15px', color: '#334155' }}>{squadCount}/25</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Overseas</span>
                            <span style={{ fontWeight: '800', fontSize: '15px', color: overseasCount > 8 ? '#ef4444' : '#334155' }}>
                              {overseasCount}/8
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Row - Right Column: Upcoming Queue, Controls, & Logs (Spans 1/3 width) */}
            <div style={{ flex: '1 1 30%', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* UPCOMING PLAYERS ACCORDION/LIST */}
              <div style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="font-display" style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.05em' }}>UPCOMING PLAYER LIST</h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    {roomPlayers.filter(p => p.status === 'available').length} remaining
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                  {roomPlayers
                    .filter(p => p.status === 'available' && p.player_id !== roomState.current_player_id && p.id !== roomState.current_player_id)
                    .map(p => (
                      <div key={p.id || p.player_id} style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{p.name}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{p.role}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="font-display" style={{ fontSize: '13px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fffbeb', padding: '4px 10px', borderRadius: '6px' }}>
                            Base: ₹{p.base_price} Cr
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              

              
              {/* LIVE LOGS / COMMMENTARY / CHAT */}
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '350px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                  <h3 className="font-display" style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.05em', marginBottom: '16px' }}>LIVE COMMENTARY & FEED</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px', fontStyle: 'italic' }}>
                        Commentary box is quiet... Waiting for bidding war.
                      </div>
                    ) : (
                      comments.map(c => {
                        const teamInfo = FRANCHISES.find(f => f.id === c.team);
                        
                        let textColor = '#334155';
                        if (c.type === 'system') {
                          textColor = '#d97706';
                        }

                        return (
                          <div key={c.id} style={{ fontSize: '13px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {c.team !== 'SYSTEM' && c.team !== 'SPECTATOR' ? (
                                  <span 
                                    className="font-display"
                                    style={{ fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', backgroundColor: teamInfo?.color, color: teamInfo?.text, letterSpacing: '0.05em' }}
                                  >
                                    {c.team}
                                  </span>
                                ) : (
                                  <span className="font-display" style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                    {c.team}
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.time}</span>
                              </div>
                            </div>
                            <p style={{ color: textColor, fontWeight: c.type === 'system' ? 'bold' : '500', lineHeight: '1.4' }}>{c.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Input text */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <input 
                    type="text" 
                    placeholder="Send message to room..." 
                    value={commentInput} 
                    onChange={(e) => setCommentInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    style={{ flex: 1, padding: '10px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                  />
                  <button 
                    onClick={handleSendComment}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
            

            {/* FULL SQUAD VIEW DRAWER (WIDESPAN FOOTER) */}
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.05em' }}>ROSTER LISTING & SQUADS</h3>
                
                {/* Roster filter */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }}>
                  <button 
                    onClick={() => setShowRosterTeam('ALL')}
                    style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: '1px solid', borderColor: showRosterTeam === 'ALL' ? '#f59e0b' : '#e2e8f0', backgroundColor: showRosterTeam === 'ALL' ? '#f59e0b' : '#f8fafc', color: showRosterTeam === 'ALL' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                  >
                    All Sold
                  </button>
                  <button 
                    onClick={() => setShowRosterTeam(selectedTeam)}
                    style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: '1px solid', borderColor: showRosterTeam === selectedTeam ? '#f59e0b' : '#e2e8f0', backgroundColor: showRosterTeam === selectedTeam ? '#f59e0b' : '#f8fafc', color: showRosterTeam === selectedTeam ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                  >
                    My Squad
                  </button>
                  {FRANCHISES.filter(f => f.id !== selectedTeam).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setShowRosterTeam(f.id)}
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: '1px solid', borderColor: showRosterTeam === f.id ? '#cbd5e1' : '#e2e8f0', backgroundColor: showRosterTeam === f.id ? '#e2e8f0' : '#f8fafc', color: showRosterTeam === f.id ? '#0f172a' : '#64748b', transition: 'all 0.2s' }}
                    >
                      {f.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster display grid */}
              {(() => {
                const filteredRosters = roomPlayers.filter(p => {
                  if (showRosterTeam === 'ALL') return p.status === 'sold';
                  return p.status === 'sold' && p.sold_to === showRosterTeam;
                });

                if (filteredRosters.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px', fontStyle: 'italic', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                      No players purchased yet for this filter.
                    </div>
                  );
                }

                return (
                  <div style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Player Name</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Role</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Country</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Sold To</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Price Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRosters.map((p, idx) => {
                          const buyerInfo = FRANCHISES.find(f => f.id === p.sold_to);
                          return (
                            <tr key={p.id || p.player_id} style={{ borderBottom: idx === filteredRosters.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{p.name}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span className={`badge ${
                                  p.role === 'Batsman' ? 'badge-batsman' : p.role === 'Bowler' ? 'badge-bowler' : p.role === 'All-Rounder' ? 'badge-ar' : 'badge-wk'
                                }`}>
                                  {p.role}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.country}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span 
                                  className="font-display"
                                  style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', backgroundColor: buyerInfo?.color, color: buyerInfo?.text, letterSpacing: '0.05em' }}
                                >
                                  {p.sold_to}
                                </span>
                              </td>
                              <td className="font-display" style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>₹{p.sold_price} <span style={{fontSize:'11px', color:'#64748b'}}>Cr</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
  );
};

export default AuctionRoom;
