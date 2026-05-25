import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Home, Swords, DollarSign, TrendingUp, TrendingDown, Handshake, ShieldAlert, Sparkles } from 'lucide-react';
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
  const [cashOffer, setCashOffer] = useState(0);
  
  const [tradeStatus, setTradeStatus] = useState(null); // { status: 'success' | 'rejected', message: '' }
  const [counterOffer, setCounterOffer] = useState(null); // { cash: number, message: string }
  const [isProcessing, setIsProcessing] = useState(false);

  const mySquad = roomPlayers.filter(p => p.sold_to === userTeam).sort((a, b) => b.rating - a.rating);
  const targetSquad = roomPlayers.filter(p => p.sold_to === selectedTargetTeam).sort((a, b) => b.rating - a.rating);

  const targetParticipant = participants.find(p => p.team_name === selectedTargetTeam);
  const userBudget = userParticipant?.budget || 0;
  const targetBudget = targetParticipant?.budget || 0;

  // Reset selections when target team changes
  useEffect(() => {
    setSelectedRequestedPlayer(null);
    setCashOffer(0);
    setCounterOffer(null);
    setTradeStatus(null);
  }, [selectedTargetTeam]);

  // Reset counter-offer when players change
  useEffect(() => {
    setCounterOffer(null);
    setTradeStatus(null);
  }, [selectedOfferedPlayer, selectedRequestedPlayer]);

  // Budget validation
  const userBudgetAfter = Number((userBudget - cashOffer).toFixed(2));
  const targetBudgetAfter = Number((targetBudget + cashOffer).toFixed(2));
  const isBudgetInvalid = userBudgetAfter < 0 || targetBudgetAfter < 0;

  const handleProposeTrade = () => {
    if (!selectedOfferedPlayer || !selectedRequestedPlayer) return;
    if (isBudgetInvalid) return;
    
    setIsProcessing(true);
    setCounterOffer(null);
    setTradeStatus(null);

    // Simulate a brief "thinking" delay for immersion
    setTimeout(() => {
      if (targetParticipant?.isBot) {
        const evaluation = evaluateTradeOffer(
          selectedOfferedPlayer, 
          selectedRequestedPlayer, 
          selectedTargetTeam, 
          roomPlayers,
          cashOffer,
          participants
        );
        
        if (evaluation.accepted) {
          setTradeStatus({ status: 'success', message: evaluation.reason });
          executeTrade(selectedOfferedPlayer.id, selectedRequestedPlayer.id, cashOffer);
          setSelectedOfferedPlayer(null);
          setSelectedRequestedPlayer(null);
          setCashOffer(0);
          setTimeout(() => setTradeStatus(null), 6000);
        } else if (evaluation.canCounter) {
          // Bot wants to counter!
          setCounterOffer({
            cash: evaluation.counterCash,
            message: evaluation.reason
          });
        } else {
          setTradeStatus({ status: 'rejected', message: evaluation.reason });
          setTimeout(() => setTradeStatus(null), 6000);
        }
      } else {
        setTradeStatus({ status: 'rejected', message: "Online player-to-player trades are not yet supported." });
        setTimeout(() => setTradeStatus(null), 5000);
      }
      setIsProcessing(false);
    }, 800);
  };

  const handleAcceptCounter = () => {
    if (!counterOffer || !selectedOfferedPlayer || !selectedRequestedPlayer) return;
    
    // Validate counter cash against budgets
    const counterUserBudget = Number((userBudget - counterOffer.cash).toFixed(2));
    const counterTargetBudget = Number((targetBudget + counterOffer.cash).toFixed(2));
    
    if (counterUserBudget < 0 || counterTargetBudget < 0) {
      setTradeStatus({ status: 'rejected', message: "You cannot afford the counter-offer amount!" });
      setCounterOffer(null);
      setTimeout(() => setTradeStatus(null), 5000);
      return;
    }

    executeTrade(selectedOfferedPlayer.id, selectedRequestedPlayer.id, counterOffer.cash);
    setTradeStatus({ status: 'success', message: `Counter-offer accepted! Trade completed with ₹${Math.abs(counterOffer.cash)} Cr cash adjustment.` });
    setCounterOffer(null);
    setSelectedOfferedPlayer(null);
    setSelectedRequestedPlayer(null);
    setCashOffer(0);
    setTimeout(() => setTradeStatus(null), 6000);
  };

  const handleDeclineCounter = () => {
    setCounterOffer(null);
    setTradeStatus({ status: 'rejected', message: "You declined the counter-offer. The trade is off." });
    setTimeout(() => setTradeStatus(null), 5000);
  };

  const PlayerCard = ({ player, isSelected, onClick, isTarget }) => (
    <div 
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderRadius: '14px',
        border: isSelected 
          ? (isTarget ? '2px solid #f43f5e' : '2px solid #10b981') 
          : '1px solid #e2e8f0',
        backgroundColor: isSelected 
          ? (isTarget ? 'rgba(244,63,94,0.04)' : 'rgba(16,185,129,0.04)') 
          : '#ffffff',
        boxShadow: isSelected 
          ? (isTarget ? '0 4px 12px rgba(244,63,94,0.12)' : '0 4px 12px rgba(16,185,129,0.12)') 
          : '0 1px 2px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isSelected ? 'scale(1.015)' : 'scale(1)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
      onMouseOver={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#f59e0b';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.1)';
          e.currentTarget.style.transform = 'scale(1.01)';
        }
      }}
      onMouseOut={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '800', fontSize: '17px',
        backgroundColor: isSelected 
          ? (isTarget ? '#fce7f3' : '#d1fae5') 
          : '#f1f5f9',
        color: isSelected
          ? (isTarget ? '#be123c' : '#047857')
          : '#475569',
        transition: 'all 0.25s',
        fontFamily: "'Outfit', sans-serif",
        flexShrink: 0,
      }}>
        {player.rating}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{player.role}</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span>{player.country === 'India' ? '🇮🇳' : '✈️'} {player.country}</span>
        </div>
      </div>
      {player.sold_price > 0 && (
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb', padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>
          ₹{player.sold_price} Cr
        </div>
      )}
    </div>
  );

  const targetTeamInfo = FRANCHISES.find(f => f.id === selectedTargetTeam);

  return (
    <div className="max-w-6xl mx-auto w-full my-8 flex flex-col gap-8 view-enter-active">
      {/* HEADER */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute top-0 left-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}>
            <ArrowLeftRight size={28} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              Trade Market
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Negotiate player swaps with cash adjustments before the season begins.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 10 }}>
          <button onClick={handleLeaveRoom} className="btn-secondary" style={{ fontSize: '12px', padding: '10px 16px' }}>
            <Home size={16} /> Exit
          </button>
          <button onClick={handleProceedToSeason} className="btn-primary" style={{ fontSize: '12px', padding: '10px 16px' }}>
            Start Season <Swords size={16} />
          </button>
        </div>
      </div>

      {/* TRADE STATUS ALERT */}
      {tradeStatus && (
        <div 
          className="animate-fadeInDown"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            border: `1px solid ${tradeStatus.status === 'success' ? '#86efac' : '#fecaca'}`,
            backgroundColor: tradeStatus.status === 'success' ? '#f0fdf4' : '#fef2f2',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          {tradeStatus.status === 'success' 
            ? <CheckCircle2 size={24} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} /> 
            : <XCircle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          }
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px', color: tradeStatus.status === 'success' ? '#15803d' : '#b91c1c' }}>
              {tradeStatus.status === 'success' ? '✅ Trade Completed!' : '❌ Trade Rejected'}
            </div>
            <div style={{ fontSize: '13px', color: tradeStatus.status === 'success' ? '#166534' : '#991b1b', lineHeight: '1.5' }}>
              "{tradeStatus.message}"
            </div>
          </div>
        </div>
      )}

      {/* COUNTER-OFFER PANEL */}
      {counterOffer && (
        <div 
          className="animate-fadeInDown"
          style={{
            padding: '24px',
            borderRadius: '20px',
            border: '2px solid #f59e0b',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            boxShadow: '0 10px 30px -5px rgba(245,158,11,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative corner sparkle */}
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 10 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }}>
              <Handshake size={22} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                🤝 Counter-Offer Received!
              </h3>
              <p style={{ fontSize: '12px', color: '#b45309', margin: 0, marginTop: '2px' }}>
                {selectedTargetTeam} management has a counter-proposal
              </p>
            </div>
          </div>
          
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '20px', position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
              "{counterOffer.message}"
            </p>
            
            {/* Visual summary of counter */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '10px 16px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #86efac' }}>
                <div style={{ fontSize: '10px', color: '#047857', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>You Give</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#064e3b' }}>
                  {selectedOfferedPlayer?.name}
                  {counterOffer.cash > 0 && <span style={{ color: '#dc2626' }}> + ₹{counterOffer.cash} Cr</span>}
                </div>
              </div>
              <ArrowLeftRight size={20} style={{ color: '#d97706' }} />
              <div style={{ textAlign: 'center', padding: '10px 16px', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>You Get</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#7f1d1d' }}>
                  {selectedRequestedPlayer?.name}
                  {counterOffer.cash < 0 && <span style={{ color: '#16a34a' }}> + ₹{Math.abs(counterOffer.cash)} Cr</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 10 }}>
            <button
              onClick={handleAcceptCounter}
              className="premium-btn-bounce"
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(22,163,74,0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,163,74,0.3)'; }}
            >
              ✅ Accept Counter
            </button>
            <button
              onClick={handleDeclineCounter}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              ❌ Decline
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT: YOUR SQUAD */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <TeamLogo teamId={userTeam} className="w-10 h-10" />
            <div>
              <h2 className="font-display" style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', margin: 0 }}>Your Squad</h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, marginTop: '2px', fontWeight: '600' }}>Select a player to offer</p>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '8px' }}>
              ₹{userBudget} Cr
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '6px' }} className="custom-scroll">
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

        {/* CENTER: TRADE CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '16px' }}>
          
          {/* Swap Icon */}
          <div 
            style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              border: '3px solid #ffffff', 
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'rotate(180deg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'rotate(0deg)'; }}
          >
            <ArrowLeftRight size={26} style={{ color: '#64748b' }} />
          </div>

          {/* Cash Slider Section */}
          <div style={{ 
            width: '100%', 
            padding: '20px', 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={16} style={{ color: '#d97706' }} />
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cash Adjustment</span>
            </div>
            
            {/* Cash amount display */}
            <div style={{ 
              textAlign: 'center', 
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: cashOffer === 0 ? '#f8fafc' : (cashOffer > 0 ? '#fef2f2' : '#ecfdf5'),
              border: `1px solid ${cashOffer === 0 ? '#e2e8f0' : (cashOffer > 0 ? '#fecaca' : '#86efac')}`,
              transition: 'all 0.3s',
            }}>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '900', color: cashOffer === 0 ? '#94a3b8' : (cashOffer > 0 ? '#dc2626' : '#16a34a') }}>
                {cashOffer === 0 ? 'No Cash' : (cashOffer > 0 ? `-₹${cashOffer.toFixed(2)} Cr` : `+₹${Math.abs(cashOffer).toFixed(2)} Cr`)}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>
                {cashOffer === 0 ? 'Straight swap' : (cashOffer > 0 
                  ? `You pay ${selectedTargetTeam || 'opponent'} ₹${cashOffer.toFixed(2)} Cr` 
                  : `${selectedTargetTeam || 'Opponent'} pays you ₹${Math.abs(cashOffer).toFixed(2)} Cr`)}
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={-10}
              max={10}
              step={0.25}
              value={cashOffer}
              onChange={(e) => setCashOffer(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                appearance: 'none',
                WebkitAppearance: 'none',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer',
                background: `linear-gradient(to right, #16a34a, #e2e8f0 50%, #dc2626)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontWeight: '700' }}>
              <span>They pay ₹10Cr</span>
              <span>You pay ₹10Cr</span>
            </div>

            {/* Live budget preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>Your purse:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>₹{userBudget}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>→</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: userBudgetAfter < 0 ? '#dc2626' : '#0f172a' }}>
                    ₹{userBudgetAfter.toFixed(2)}
                  </span>
                  {cashOffer !== 0 && (
                    cashOffer > 0 
                      ? <TrendingDown size={12} style={{ color: '#dc2626' }} />
                      : <TrendingUp size={12} style={{ color: '#16a34a' }} />
                  )}
                </div>
              </div>
              
              {selectedTargetTeam && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>{selectedTargetTeam}:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>₹{targetBudget}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>→</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: targetBudgetAfter < 0 ? '#dc2626' : '#0f172a' }}>
                      ₹{targetBudgetAfter.toFixed(2)}
                    </span>
                    {cashOffer !== 0 && (
                      cashOffer > 0 
                        ? <TrendingUp size={12} style={{ color: '#16a34a' }} />
                        : <TrendingDown size={12} style={{ color: '#dc2626' }} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Budget warning */}
            {isBudgetInvalid && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                <ShieldAlert size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#b91c1c' }}>Insufficient budget for this cash amount!</span>
              </div>
            )}
          </div>

          {/* PROPOSE BUTTON */}
          <button 
            onClick={handleProposeTrade}
            disabled={!selectedOfferedPlayer || !selectedRequestedPlayer || isBudgetInvalid || isProcessing}
            className="premium-btn-bounce"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              background: (!selectedOfferedPlayer || !selectedRequestedPlayer || isBudgetInvalid || isProcessing)
                ? 'linear-gradient(135deg, #cbd5e1, #94a3b8)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '16px',
              cursor: (!selectedOfferedPlayer || !selectedRequestedPlayer || isBudgetInvalid || isProcessing) ? 'not-allowed' : 'pointer',
              boxShadow: (!selectedOfferedPlayer || !selectedRequestedPlayer || isBudgetInvalid || isProcessing)
                ? 'none'
                : '0 6px 16px rgba(245,158,11,0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: "'Outfit', sans-serif",
              transition: 'all 0.25s',
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? (
              <>
                <span style={{ fontSize: '14px' }}>EVALUATING...</span>
                <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.8, textTransform: 'lowercase' }}>Bot is considering your offer</span>
              </>
            ) : (
              <>
                <span>PROPOSE</span>
                <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.8, textTransform: 'lowercase', letterSpacing: '0.1em' }}>Trade Deal</span>
              </>
            )}
          </button>

          {/* Selected players summary mini-card */}
          {(selectedOfferedPlayer || selectedRequestedPlayer) && (
            <div style={{ width: '100%', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', color: '#16a34a' }}>{selectedOfferedPlayer?.name || '—'}</span>
                <span style={{ color: '#94a3b8', fontSize: '9px' }}>→</span>
                <span style={{ fontWeight: '700', color: '#dc2626' }}>{selectedRequestedPlayer?.name || '—'}</span>
              </div>
              {selectedOfferedPlayer && selectedRequestedPlayer && (
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                  Rating diff: {selectedOfferedPlayer.rating} vs {selectedRequestedPlayer.rating}
                  ({selectedRequestedPlayer.rating - selectedOfferedPlayer.rating > 0 ? '+' : ''}{selectedRequestedPlayer.rating - selectedOfferedPlayer.rating})
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: TARGET SQUAD */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="font-display" style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', margin: 0 }}>Target Franchise</h2>
              {targetParticipant && (
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb', padding: '4px 10px', borderRadius: '8px' }}>
                  ₹{targetBudget} Cr
                </div>
              )}
            </div>
            <select 
              value={selectedTargetTeam}
              onChange={(e) => setSelectedTargetTeam(e.target.value)}
              style={{ 
                width: '100%', padding: '10px 14px', 
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', 
                borderRadius: '10px', outline: 'none', 
                fontSize: '13px', fontWeight: '700',
                fontFamily: "'Outfit', sans-serif",
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <option value="">— Select Opponent —</option>
              {participants.filter(p => p.team_name !== userTeam).map(p => (
                <option key={p.id} value={p.team_name}>
                  {p.team_name} {p.isBot ? '(BOT)' : '(HUMAN)'}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '6px' }} className="custom-scroll">
            {!selectedTargetTeam && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: '500', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
                <Sparkles size={32} style={{ color: '#e2e8f0', marginBottom: '12px' }} />
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
