import React, { useState } from 'react';
import { Users, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import { FRANCHISES } from '../utils/constants';
import RetentionModal from '../components/RetentionModal';

const LobbyPage = ({
  roomCode,
  participants,
  userId,
  roomState,
  handleLeaveRoom,
  isHost,
  gameMode,
  handleStartAuctionOnline,
  handleStartAuctionOffline,
  expectedPlayers,
  roomPlayers,
  handleRetainPlayer
}) => {
  const [showRetentionModal, setShowRetentionModal] = useState(false);

  return (
    <div style={{ maxWidth: '42rem', margin: '32px auto', width: '100%', backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
        <Users size={48} style={{ color: '#d97706', margin: '0 auto 16px' }} />
        <h2 className="font-display" style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.05em', marginBottom: '8px' }}>AUCTION LOBBY</h2>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Wait for managers to join and claim their franchises.
        </p>
        
        <div style={{ marginTop: '24px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', display: 'inline-block' }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ROOM CODE</span>
          <span className="font-display" style={{ fontSize: '32px', fontWeight: 'bold', color: '#d97706', letterSpacing: '0.2em' }}>{roomCode}</span>
        </div>
      </div>

      <div style={{ marginBottom: '32px', position: 'relative', zIndex: 10 }}>
        <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Joined Managers ({participants.length}/10)
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {participants.map(p => {
            const teamInfo = FRANCHISES.find(f => f.id === p.team_name);
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <TeamLogo teamId={teamInfo?.id} className="w-10 h-10" />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>{p.user_name}</span>
                    {p.user_id === userId && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>YOU</span>
                    )}
                    {p.isBot && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #fde68a' }}>BOT</span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="font-display" style={{ fontSize: '13px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '8px', backgroundColor: teamInfo?.color, color: teamInfo?.text, letterSpacing: '0.05em' }}>
                    {p.team_name}
                  </span>
                  {p.user_id === roomState.host_id && (
                    <span style={{ fontSize: '10px', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.05em' }}>HOST</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', position: 'relative', zIndex: 10 }}>
        <button onClick={handleLeaveRoom} className="btn-secondary" style={{ padding: '12px 24px' }}>
          Cancel
        </button>

        {isHost ? (
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => setShowRetentionModal(true)}
              className="btn-secondary"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ShieldCheck size={18} /> Setup Retentions
            </button>
            <button 
              onClick={gameMode === 'online' ? handleStartAuctionOnline : handleStartAuctionOffline}
              disabled={gameMode === 'online' && participants.filter(p => !p.isBot).length < expectedPlayers}
              className={`btn-primary ${gameMode === 'online' && participants.filter(p => !p.isBot).length < expectedPlayers ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ padding: '12px 24px' }}
            >
              {gameMode === 'online' && participants.filter(p => !p.isBot).length < expectedPlayers ? (
                `WAITING FOR ${expectedPlayers - participants.filter(p => !p.isBot).length} MORE...`
              ) : (
                <>START AUCTION <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontStyle: 'italic', fontWeight: '500' }}>
            <RefreshCw size={16} className="animate-spin" style={{ color: '#d97706' }} />
            Waiting for host to start...
          </div>
        )}
      </div>

      <RetentionModal 
        isOpen={showRetentionModal}
        onClose={() => setShowRetentionModal(false)}
        roomPlayers={roomPlayers}
        participants={participants}
        onRetain={handleRetainPlayer}
      />
    </div>
  );
};

export default LobbyPage;
