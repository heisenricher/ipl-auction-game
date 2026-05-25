import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Home, Swords } from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import { FRANCHISES } from '../utils/constants';
import { evaluateTradeOffer } from '../utils/botLogic';

const TradeMarket = ({
  participants,
  roomPlayers,
  userId,
  handleLeaveRoom,
  handleProceedToSeason,
  executeTrade
}) => {
  const userParticipant = participants.find(p => p.user_id === userId);
  const userTeam = userParticipant?.team_name;
  
  const [selectedOfferedPlayer, setSelectedOfferedPlayer] = useState(null);
  const [selectedTargetTeam, setSelectedTargetTeam] = useState('');
  const [selectedRequestedPlayer, setSelectedRequestedPlayer] = useState(null);
  
  const [tradeStatus, setTradeStatus] = useState(null); // { status: 'success' | 'rejected', message: '' }

  const mySquad = roomPlayers.filter(p => p.sold_to === userTeam).sort((a, b) => b.rating - a.rating);
  const targetSquad = roomPlayers.filter(p => p.sold_to === selectedTargetTeam).sort((a, b) => b.rating - a.rating);

  const handleProposeTrade = () => {
    if (!selectedOfferedPlayer || !selectedRequestedPlayer) return;
    
    const targetParticipant = participants.find(p => p.team_name === selectedTargetTeam);
    
    if (targetParticipant?.isBot) {
      // Evaluate with Bot AI
      const evaluation = evaluateTradeOffer(selectedOfferedPlayer, selectedRequestedPlayer, selectedTargetTeam, roomPlayers);
      
      if (evaluation.accepted) {
        setTradeStatus({ status: 'success', message: evaluation.reason });
        executeTrade(selectedOfferedPlayer.id, selectedRequestedPlayer.id);
        setSelectedOfferedPlayer(null);
        setSelectedRequestedPlayer(null);
      } else {
        setTradeStatus({ status: 'rejected', message: evaluation.reason });
      }
    } else {
      // If multiplayer, we would send a websocket request here.
      // For now, in local sandbox, we'll auto-reject for other humans unless implemented.
      setTradeStatus({ status: 'rejected', message: "Online player-to-player trades are not yet supported." });
    }
    
    // Clear status after 5s
    setTimeout(() => setTradeStatus(null), 5000);
  };

  const PlayerCard = ({ player, isSelected, onClick, isTarget }) => (
    <div 
      onClick={onClick}
      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isSelected ? (isTarget ? 'border-rose-500 bg-rose-50' : 'border-emerald-500 bg-emerald-50') : 'border-slate-200 bg-white hover:border-amber-300'}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${isSelected ? (isTarget ? 'bg-rose-200 text-rose-700' : 'bg-emerald-200 text-emerald-700') : 'bg-slate-100 text-slate-600'}`}>
        {player.rating}
      </div>
      <div className="flex-1">
        <div className="font-bold text-slate-900">{player.name}</div>
        <div className="text-xs text-slate-500">{player.role} • {player.country}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full my-8 flex flex-col gap-8">
      {/* HEADER */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', display: 'flex', justifyItems: 'space-between', alignItems: 'center' }}>
        <div className="flex justify-between items-center w-full">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <ArrowLeftRight size={48} style={{ color: '#0ea5e9' }} />
            <div>
              <h1 className="font-display" style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1.1', color: '#0f172a', textTransform: 'uppercase' }}>
                Trade Market
              </h1>
              <p style={{ color: '#475569', fontSize: '15px' }}>Negotiate last-minute player swaps before the season begins.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleLeaveRoom} className="btn-secondary text-sm px-4 py-2">
              <Home size={16} /> Exit
            </button>
            <button onClick={handleProceedToSeason} className="btn-primary text-sm px-4 py-2">
              Start Season <Swords size={16} />
            </button>
          </div>
        </div>
      </div>

      {tradeStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeInDown ${tradeStatus.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {tradeStatus.status === 'success' ? <CheckCircle2 size={24} className="text-emerald-600 shrink-0" /> : <XCircle size={24} className="text-rose-600 shrink-0" />}
          <div>
            <div className="font-bold text-lg mb-1">{tradeStatus.status === 'success' ? 'Trade Accepted!' : 'Trade Rejected'}</div>
            <div className="text-sm">"{tradeStatus.message}"</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
        
        {/* LEFT: YOUR SQUAD */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <TeamLogo teamId={userTeam} className="w-10 h-10" />
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Your Squad</h2>
              <p className="text-xs text-slate-500">Select a player to offer</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scroll flex flex-col gap-3 pr-2">
            {mySquad.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                isSelected={selectedOfferedPlayer?.id === player.id}
                onClick={() => setSelectedOfferedPlayer(player)}
              />
            ))}
          </div>
        </div>

        {/* CENTER: TRADE ACTION */}
        <div className="flex flex-col items-center justify-center h-full gap-8 py-10 md:py-0">
           <div className="flex flex-col items-center">
             <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-xl z-10 relative">
               <ArrowLeftRight size={32} className="text-slate-400" />
             </div>
             
             <div className="h-24 w-1 bg-slate-200 -my-4 z-0"></div>
           </div>

           <button 
             onClick={handleProposeTrade}
             disabled={!selectedOfferedPlayer || !selectedRequestedPlayer}
             className="btn-primary flex-col py-4 px-6 gap-2 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/30 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
           >
             <span className="font-display font-black text-xl tracking-wide">PROPOSE</span>
             <span className="text-xs font-semibold opacity-90 uppercase tracking-widest">Trade</span>
           </button>
        </div>

        {/* RIGHT: TARGET SQUAD */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="flex flex-col gap-3 mb-6 pb-4 border-b border-slate-100">
            <h2 className="font-display font-bold text-lg text-slate-900">Target Franchise</h2>
            <select 
              value={selectedTargetTeam}
              onChange={(e) => {
                setSelectedTargetTeam(e.target.value);
                setSelectedRequestedPlayer(null); // reset selection
              }}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-display font-semibold"
            >
              <option value="">-- Select Opponent --</option>
              {participants.filter(p => p.team_name !== userTeam).map(p => (
                <option key={p.id} value={p.team_name}>
                  {p.team_name} {p.isBot ? '(BOT)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scroll flex flex-col gap-3 pr-2">
            {!selectedTargetTeam && (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic text-center px-6">
                Select a franchise above to view their squad and request a player.
              </div>
            )}
            {selectedTargetTeam && targetSquad.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                isSelected={selectedRequestedPlayer?.id === player.id}
                isTarget={true}
                onClick={() => setSelectedRequestedPlayer(player)}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TradeMarket;
