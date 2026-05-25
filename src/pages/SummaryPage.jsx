import React from 'react';
import { Trophy, RotateCcw, Swords, ArrowLeftRight } from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import { FRANCHISES } from '../utils/constants';

const SummaryPage = ({
  participants,
  roomPlayers,
  selectedTeam,
  handleLeaveRoom,
  calculateSquadRating,
  getTeamSquadCount,
  getOverseasCount,
  handleProceedToSeason,
  handleProceedToTrade
}) => {
  return (
    <div className="max-w-4xl mx-auto w-full glass-panel p-8 my-8 relative view-enter-active">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="text-center mb-8">
        <Trophy size={48} className="text-amber-500 mx-auto mb-2 animate-bounce" />
        <h2 className="text-4xl font-bold font-display text-slate-900">MEGA AUCTION SUMMARY</h2>
        <p className="text-slate-600 text-sm">
          All players have been auctioned. Here is the final leaderboard:
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="responsive-table-container mb-8">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Franchise / Manager</th>
              <th>Remaining Budget</th>
              <th>Squad Size</th>
              <th>Overseas</th>
              <th>Avg Squad Rating</th>
              <th>Squad Rating Check</th>
            </tr>
          </thead>
          <tbody>
            {[...participants]
              .sort((a, b) => calculateSquadRating(b.team_name) - calculateSquadRating(a.team_name))
              .map((p, idx) => {
                const teamInfo = FRANCHISES.find(f => f.id === p.team_name);
                const squadRating = calculateSquadRating(p.team_name);
                const squadCount = getTeamSquadCount(p.team_name);
                const overseasCount = getOverseasCount(p.team_name);
                
                // Check constraints: min 18, max 8 overseas
                const complies = squadCount >= 18 && squadCount <= 25 && overseasCount <= 8;
                const delayClass = `stagger-item delay-${Math.min(5, idx + 1) * 100}`;

                return (
                  <tr key={p.id} className={delayClass} style={{ transition: 'all 0.2s' }}>
                    <td className="font-display font-bold text-lg text-slate-800">#{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TeamLogo teamId={teamInfo?.id} className="w-8 h-8" />
                        <div>
                          <span className="font-semibold text-slate-950 block">{p.user_name}</span>
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded font-display mt-0.5 inline-block"
                            style={{ backgroundColor: teamInfo?.color, color: teamInfo?.text }}
                          >
                            {p.team_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="font-bold text-slate-900 font-display">₹{p.budget} Cr</td>
                    <td className="text-slate-700 font-display">{squadCount}/25</td>
                    <td className="text-slate-700 font-display">{overseasCount}/8</td>
                    <td className="text-amber-600 font-bold font-display text-lg">{squadRating}</td>
                    <td>
                      {complies ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase">
                          Valid Squad
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-bold uppercase" title="Must have 18-25 players and max 8 overseas">
                          Invalid Squad
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Post-Auction AI analysis */}
      {(() => {
        const getPlayerMarketValue = (player) => {
          let value = player.base_price || player.basePrice || 0.50;
          if (player.rating >= 95) value += 8.5;
          else if (player.rating >= 90) value += 6.0;
          else if (player.rating >= 85) value += 3.5;
          else if (player.rating >= 80) value += 1.5;
          else value += 0.5;
          return Number(value.toFixed(2));
        };

        const soldPlayers = roomPlayers.filter(p => p.status === 'sold' && p.sold_price);

        const steals = soldPlayers
          .map(p => {
            const estValue = getPlayerMarketValue(p);
            const difference = estValue - p.sold_price;
            return { player: p, estValue, difference };
          })
          .filter(item => item.difference > 0)
          .sort((a, b) => b.difference - a.difference)
          .slice(0, 3);

        const overpays = soldPlayers
          .map(p => {
            const estValue = getPlayerMarketValue(p);
            const difference = p.sold_price - estValue;
            return { player: p, estValue, difference };
          })
          .filter(item => item.difference > 0)
          .sort((a, b) => b.difference - a.difference)
          .slice(0, 3);

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }} className="no-print animate-fadeInUp">
            
            {/* Steals */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💎 BIGGEST STEALS OF THE AUCTION
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {steals.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', fontStyle: 'italic', padding: '20px 0' }}>
                    No significant steals found in this auction.
                  </div>
                ) : (
                  steals.map((item, idx) => {
                    const teamInfo = FRANCHISES.find(f => f.id === item.player.sold_to);
                    return (
                      <div key={item.player.id || item.player.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '12px' }}>#{idx + 1}</span>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{item.player.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                            Sold to <span style={{ fontWeight: 'bold', color: teamInfo?.color }}>{item.player.sold_to}</span> • Est. Value: ₹{item.estValue} Cr
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#16a34a' }}>₹{item.player.sold_price} Cr</div>
                          <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 'bold' }}>Saved ₹{item.difference.toFixed(2)} Cr!</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Overpays */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#ea580c', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔥 BIGGEST OVERPAYS OF THE AUCTION
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overpays.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', fontStyle: 'italic', padding: '20px 0' }}>
                    No significant overpays found in this auction.
                  </div>
                ) : (
                  overpays.map((item, idx) => {
                    const teamInfo = FRANCHISES.find(f => f.id === item.player.sold_to);
                    return (
                      <div key={item.player.id || item.player.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 'bold', color: '#ea580c', fontSize: '12px' }}>#{idx + 1}</span>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{item.player.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                            Sold to <span style={{ fontWeight: 'bold', color: teamInfo?.color }}>{item.player.sold_to}</span> • Est. Value: ₹{item.estValue} Cr
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#ea580c' }}>₹{item.player.sold_price} Cr</div>
                          <div style={{ fontSize: '10px', color: '#c2410c', fontWeight: 'bold' }}>+₹{item.difference.toFixed(2)} Cr Premium</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        );
      })()}

      {/* Individual Squad details */}
      <div className="glass-panel p-6 mb-8" style={{ border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <h3 className="text-lg font-bold font-display text-slate-900 mb-4">YOUR SQUAD ROSTER ({getTeamSquadCount(selectedTeam)} players)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roomPlayers
            .filter(p => p.sold_to === selectedTeam)
            .map((p, idx) => {
              const compliesColor = p.rating >= 90 ? 'gold-card-glow border-amber-300 bg-amber-50/30' : p.rating >= 85 ? 'silver-card-glow border-slate-300 bg-slate-50/50' : 'standard-card-glow border-blue-200 bg-blue-50/20';
              const delayClass = `stagger-item delay-${Math.min(5, idx + 1) * 100}`;
              return (
                <div key={p.id || p.player_id} className={`p-3 border rounded-xl flex flex-col justify-between premium-btn-bounce ${compliesColor} ${delayClass}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-900 text-xs block truncate max-w-[120px]">{p.name}</span>
                    <span className={`text-[8px] badge ${p.role === 'Batsman' ? 'badge-batsman' : p.role === 'Bowler' ? 'badge-bowler' : p.role === 'All-Rounder' ? 'badge-ar' : 'badge-wk'}`}>
                      {p.role}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-200">
                    <span className="text-amber-600 font-bold font-display">Rating: {p.rating}</span>
                    <span className="text-slate-600 font-display">Cost: ₹{p.sold_price} Cr</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="flex justify-center gap-4 no-print">
        <button 
          onClick={() => window.print()}
          className="btn-secondary"
          style={{ padding: '12px 32px', fontSize: '16px', backgroundColor: '#ecfdf5', borderColor: '#10b981', color: '#047857' }}
        >
          DOWNLOAD PDF 📄
        </button>
        <button 
          onClick={handleLeaveRoom}
          className="btn-secondary"
        >
          <RotateCcw size={18} /> HOME
        </button>
        <button 
          onClick={handleProceedToTrade}
          className="btn-secondary"
          style={{ padding: '12px 32px', fontSize: '16px', backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
        >
          TRADE MARKET <ArrowLeftRight size={20} />
        </button>
        <button 
          onClick={handleProceedToSeason}
          className="btn-primary"
          style={{ padding: '12px 32px', fontSize: '16px' }}
        >
          PROCEED TO SEASON <Swords size={20} />
        </button>
      </div>
    </div>
  );
};

export default SummaryPage;
