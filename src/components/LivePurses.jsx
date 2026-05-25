import React, { useState, useEffect } from 'react';

const LivePurses = ({ selectedTeam, participants, roomState, allPlayers = [] }) => {
  const [recentBidders, setRecentBidders] = useState([]);

  useEffect(() => {
    if (roomState.current_bidder) {
      setRecentBidders(prev => {
        if (prev[0] === roomState.current_bidder) return prev;
        const next = [roomState.current_bidder, ...prev.filter(b => b !== roomState.current_bidder)];
        return next.slice(0, 3);
      });
    } else if (roomState.status === 'pending' || roomState.status === 'sold') {
      setRecentBidders([]);
    }
  }, [roomState.current_bidder, roomState.status]);

  const myParticipant = participants.find(p => p.team_name === selectedTeam);
  const myActiveBid = roomState.current_bidder === selectedTeam ? roomState.current_bid : 0;
  const myPurse = myParticipant ? (myParticipant.budget - myActiveBid).toFixed(2) : '120.00';

  const otherBidders = recentBidders.filter(b => b !== selectedTeam).slice(0, 2);

  const renderTeamStats = (teamName) => {
    const teamPlayers = allPlayers.filter(p => p.status === 'sold' && p.sold_to === teamName);
    const bat = teamPlayers.filter(p => p.role === 'Batsman' || p.role === 'Wicket Keeper').length;
    const bowl = teamPlayers.filter(p => p.role === 'Bowler').length;
    const ar = teamPlayers.filter(p => p.role === 'All-Rounder').length;
    const os = teamPlayers.filter(p => p.country !== 'India').length;
    
    return (
      <div style={{ display: 'flex', gap: '10px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '6px' }}>
        <span title="Batsmen/Keepers">BAT: {bat}</span>
        <span title="Bowlers">BWL: {bowl}</span>
        <span title="All-Rounders">AR: {ar}</span>
        <span title="Overseas" style={{ color: '#0ea5e9' }}>OS: {os}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
      {/* My Purse */}
      <div className="glass-card flex-1 flex flex-col justify-center relative overflow-hidden" style={{ padding: '12px' }}>
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', position: 'relative', zIndex: 10 }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Purse ({selectedTeam})
          </span>
          {myActiveBid > 0 && (
            <span style={{ fontSize: '9px', color: '#047857', fontWeight: 'bold', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
              -₹{myActiveBid} Cr
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', position: 'relative', zIndex: 10 }}>
          <span className="font-display" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>₹{myPurse}</span>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>Cr</span>
        </div>
        {renderTeamStats(selectedTeam)}
      </div>

      {/* Other Bidders */}
      {otherBidders.map((opponentTeam, idx) => {
        const participant = participants.find(p => p.team_name === opponentTeam);
        const activeBid = roomState.current_bidder === opponentTeam ? roomState.current_bid : 0;
        const purse = participant ? (participant.budget - activeBid).toFixed(2) : '0.00';
        
        return (
          <div key={opponentTeam} className="glass-card flex-1 flex flex-col justify-center relative overflow-hidden" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', position: 'relative', zIndex: 10 }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bidder ({opponentTeam})
              </span>
              {activeBid > 0 && (
                <span style={{ fontSize: '9px', color: '#b45309', fontWeight: 'bold', backgroundColor: '#fffbeb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  -₹{activeBid} Cr
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', position: 'relative', zIndex: 10 }}>
              <span className="font-display" style={{ fontSize: '20px', fontWeight: 'bold', color: '#334155' }}>₹{purse}</span>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>Cr</span>
            </div>
            {renderTeamStats(opponentTeam)}
          </div>
        );
      })}

      {otherBidders.length === 0 && (
        <div className="glass-card flex-1 flex flex-col justify-center text-center" style={{ padding: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Waiting for Challenger...
          </span>
        </div>
      )}
    </div>
  );
};

export default LivePurses;
