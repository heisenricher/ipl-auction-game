import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Users, User, ArrowRight, Play, Square, SkipForward, RotateCcw, 
  Volume2, VolumeX, ShieldAlert, Award, Globe, DollarSign, ListFilter, Settings,
  CheckCircle, Plus, Send, AlertTriangle, RefreshCw, LogOut
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { players as initialPlayers } from './data/players';
import confetti from 'canvas-confetti';

// Team Logo Component
const TeamLogo = ({ teamId, className = "", style = {} }) => {
  if (!teamId) return null;
  
  // Try to extract width/height from className if style doesn't have it
  const isW12 = className.includes('w-12');
  const isW6 = className.includes('w-6');
  const defaultSize = isW12 ? '48px' : isW6 ? '24px' : '40px';
  
  const mergedStyle = {
    width: defaultSize,
    height: defaultSize,
    objectFit: 'contain',
    ...style
  };

  return (
    <img 
      src={`/logos/${teamId.toLowerCase()}.svg`} 
      alt={`${teamId} Logo`} 
      className={className}
      style={mergedStyle}
      onError={(e) => {
        // Fallback to text if image fails to load
        e.target.style.display = 'none';
        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
      }}
    />
  );
};

// IPL Franchise List
const FRANCHISES = [
  { id: 'CSK', name: 'Chennai Super Kings', color: '#F7D117', text: '#1e1b4b' },
  { id: 'MI', name: 'Mumbai Indians', color: '#004BA0', text: '#ffffff' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24', text: '#ffffff' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: '#3A225D', text: '#ffffff' },
  { id: 'RR', name: 'Rajasthan Royals', color: '#EA1B85', text: '#ffffff' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: '#F26522', text: '#ffffff' },
  { id: 'DC', name: 'Delhi Capitals', color: '#1B3E8F', text: '#ffffff' },
  { id: 'LSG', name: 'Lucknow Super Giants', color: '#00A9E0', text: '#0f172a' },
  { id: 'GT', name: 'Gujarat Titans', color: '#0B2240', text: '#ffffff' },
  { id: 'PBKS', name: 'Punjab Kings', color: '#D71920', text: '#ffffff' }
];

// BOT Bidding Personalities & Strategies
const BOT_STRATEGIES = {
  RCB: { type: 'AGGRESSIVE', maxBidMultiplier: 1.15, minRating: 88, name: 'Aggressive Superstar Hunter' },
  MI: { type: 'AGGRESSIVE', maxBidMultiplier: 1.15, minRating: 88, name: 'Aggressive Superstar Hunter' },
  CSK: { type: 'VALUE', maxBidMultiplier: 0.95, minRating: 82, name: 'Balanced Value Seeker' },
  GT: { type: 'VALUE', maxBidMultiplier: 0.95, minRating: 82, name: 'Balanced Value Seeker' },
  PBKS: { type: 'BARGAIN', maxBidMultiplier: 0.70, minRating: 70, name: 'Bargain Hunter' },
  LSG: { type: 'BARGAIN', maxBidMultiplier: 0.70, minRating: 70, name: 'Bargain Hunter' },
  KKR: { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78, name: 'Standard Balanced Agent' },
  RR: { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78, name: 'Standard Balanced Agent' },
  SRH: { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78, name: 'Standard Balanced Agent' },
  DC: { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78, name: 'Standard Balanced Agent' }
};

// Bot Valuation Logic based on strategies
const getBotValuation = (player, teamName) => {
  const strategy = BOT_STRATEGIES[teamName] || { type: 'BALANCED', maxBidMultiplier: 0.85, minRating: 78 };
  
  // Rating-based valuation: rating 75 is base price.
  // Rating 95 gets a high bonus
  const ratingFactor = Math.max(0, (player.rating - 75)) * 0.75;
  let baseValuation = player.base_price + ratingFactor;
  
  if (strategy.type === 'AGGRESSIVE' && player.rating >= 92) {
    baseValuation *= 1.15; // Aggressive bots pay premium for superstars
  } else if (strategy.type === 'BARGAIN') {
    baseValuation *= 0.70; // Bargain hunters drop out early to save cash
  } else if (strategy.type === 'VALUE' && player.role === 'All-Rounder') {
    baseValuation *= 1.05; // Value seekers prioritize all-rounders
  } else {
    baseValuation *= strategy.maxBidMultiplier;
  }
  
  return Number(baseValuation.toFixed(2));
};

// Helper to generate a random 6-character room code

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Audio Synthesizer using Web Audio API (No files needed)
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'gavel') {
      // Wood hammer knock
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } else if (type === 'bid') {
      // Short upward chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } else if (type === 'sold') {
      // Fanfare chord
      osc.type = 'sine';
      osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.3); // C5
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
      osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.start();
      osc2.start();
      osc.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } else if (type === 'unsold') {
      // Descending buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (err) {
    // Ignore audio context blocks
  }
};

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

export default function App() {
  // App views: 'landing', 'lobby', 'auction', 'summary'
  const [view, setView] = useState('landing');
  
  // Connectivity Settings
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [gameMode, setGameMode] = useState('offline'); // 'online' or 'offline' (Sandbox)
  const [isMuted, setIsMuted] = useState(false);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 10));

  // Game Room State (Shared)
  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [expectedPlayers, setExpectedPlayers] = useState(2);
  const [numSets, setNumSets] = useState(8);
  const [timerDuration, setTimerDuration] = useState(15);
  const [roomState, setRoomState] = useState({
    status: 'lobby',
    current_player_id: null,
    current_bid: 0,
    current_bidder: null,
    bid_timer_ends: null,
    host_id: ''
  });
  
  // Local Player Specific
  const [userName, setUserName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isHost, setIsHost] = useState(false);

  // Auction State Variables
  const [timeLeft, setTimeLeft] = useState(15);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [showRosterTeam, setShowRosterTeam] = useState('ALL');
  const [gavelStrike, setGavelStrike] = useState(false);

  // Offline Sandbox State (Only used when gameMode === 'offline')
  const [offlinePlayers, setOfflinePlayers] = useState(initialPlayers);
  const [offlineParticipants, setOfflineParticipants] = useState([]);
  const [offlineBidsLog, setOfflineBidsLog] = useState([]);
  const [selectedBotTeams, setSelectedBotTeams] = useState(FRANCHISES.map(f => f.id));

  // Refs for realtime subscriptions & timers
  const roomSubscriptionRef = useRef(null);
  const participantsSubscriptionRef = useRef(null);
  const playersSubscriptionRef = useRef(null);
  const bidsSubscriptionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const aiBidTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const roomStateRef = useRef(roomState);

  // Keep roomStateRef in sync
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  // Check Supabase connection on load
  useEffect(() => {
    const checkSupabase = async () => {
      if (supabaseUrlExists()) {
        try {
          const { data, error } = await supabase.from('rooms').select('id').limit(1);
          if (!error) {
            setSupabaseConnected(true);
            setGameMode('online');
          } else {
            console.warn("Supabase check error (might be empty table):", error);
            setSupabaseConnected(true);
            setGameMode('online');
          }
        } catch (e) {
          setSupabaseConnected(false);
          setGameMode('offline');
        }
      } else {
        setSupabaseConnected(false);
        setGameMode('offline');
      }
    };
    checkSupabase();
  }, []);

  const supabaseUrlExists = () => {
    return (
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-id.supabase.co'
    );
  };

  // Sound triggering helper
  const triggerSound = (type) => {
    if (!isMuted) playSound(type);
  };

  // --- ONLINE GAME MODE: REALTIME INTEGRATION ---
  
  // Subscribe to all changes when room ID is loaded
  useEffect(() => {
    if (gameMode !== 'online' || !roomId) return;

    // 1. Subscribe to Room Status & Bids
    roomSubscriptionRef.current = supabase
      .channel(`room_changes_${roomId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'rooms', 
        filter: `id=eq.${roomId}` 
      }, payload => {
        const updated = payload.new;
        setRoomState(updated);
        
        // Trigger sounds on updates
        if (updated.current_bid > roomStateRef.current.current_bid) {
          triggerSound('bid');
        }
      })
      .subscribe();

    // 2. Subscribe to Participants changes
    participantsSubscriptionRef.current = supabase
      .channel(`participant_changes_${roomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'participants', 
        filter: `room_id=eq.${roomId}` 
      }, () => {
        fetchParticipantsOnline();
      })
      .subscribe();

    // 3. Subscribe to Room Players changes (sold / unsold)
    playersSubscriptionRef.current = supabase
      .channel(`player_changes_${roomId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'room_players', 
        filter: `room_id=eq.${roomId}` 
      }, () => {
        fetchRoomPlayersOnline();
      })
      .subscribe();

    // 4. Subscribe to Live Bids Log
    bidsSubscriptionRef.current = supabase
      .channel(`bids_log_${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bids_log', 
        filter: `room_id=eq.${roomId}` 
      }, payload => {
        const bid = payload.new;
        addLiveCommentaryOnline(bid);
      })
      .subscribe();

    // Initial Fetch
    fetchRoomStateOnline();
    fetchParticipantsOnline();
    fetchRoomPlayersOnline();
    fetchBidsLogOnline();

    return () => {
      if (roomSubscriptionRef.current) supabase.removeChannel(roomSubscriptionRef.current);
      if (participantsSubscriptionRef.current) supabase.removeChannel(participantsSubscriptionRef.current);
      if (playersSubscriptionRef.current) supabase.removeChannel(playersSubscriptionRef.current);
      if (bidsSubscriptionRef.current) supabase.removeChannel(bidsSubscriptionRef.current);
    };
  }, [roomId, gameMode]);

  // Timers: ticking countdown
  useEffect(() => {
    if (roomState.status !== 'active' || !roomState.bid_timer_ends) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      const ends = new Date(roomState.bid_timer_ends).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.ceil((ends - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && !isProcessingRef.current) {
        isProcessingRef.current = true;
        clearInterval(timerIntervalRef.current);
        if (isHost && gameMode === 'online') {
          handlePlayerSoldOrUnsoldOnline();
        } else if (gameMode === 'offline') {
          handlePlayerSoldOrUnsoldOffline();
        }
      }
    }, 200);

    return () => clearInterval(timerIntervalRef.current);
  }, [roomState.status, roomState.bid_timer_ends, roomState.current_player_id, isHost, gameMode]);

  // Fetch functions for Online Mode
  const fetchRoomStateOnline = async () => {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (!error && data) setRoomState(data);
  };

  const fetchParticipantsOnline = async () => {
    const { data, error } = await supabase.from('participants').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });
    if (!error && data) setParticipants(data);
  };

  const fetchRoomPlayersOnline = async () => {
    const { data, error } = await supabase.from('room_players').select('*').eq('room_id', roomId).order('order_index', { ascending: true });
    if (!error && data) setRoomPlayers(data);
  };

  const fetchBidsLogOnline = async () => {
    const { data, error } = await supabase.from('bids_log').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
    if (!error && data) {
      // Map to comments feed
      const logs = data.map(b => {
        const p = roomPlayers.find(pl => pl.player_id === b.player_id);
        return {
          id: b.id,
          team: b.team_name,
          text: `Bid ${b.bid_amount} Cr for ${p ? p.name : 'Player'}`,
          time: new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'bid'
        };
      });
      setComments(logs.reverse());
    }
  };

  const addLiveCommentaryOnline = async (bid) => {
    // Add single bid to top of comments
    const player = roomPlayers.find(p => p.player_id === bid.player_id);
    const pName = player ? player.name : "Player";
    const newComment = {
      id: bid.id,
      team: bid.team_name,
      text: `Bid ${bid.bid_amount} Cr for ${pName}`,
      time: new Date(bid.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'bid'
    };
    setComments(prev => [newComment, ...prev]);
  };

  // Host Action: Create a Room
  const handleCreateRoomOnline = async () => {
    if (!userName || !selectedTeam) {
      alert("Please enter username and select your franchise.");
      return;
    }

    const code = generateRoomCode();
    
    // 1. Create Room in DB
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        status: 'lobby',
        host_id: userId
      })
      .select()
      .single();

    if (roomError) {
      alert("Failed to create room: " + roomError.message);
      return;
    }

    // 2. Add Host as Participant
    const { error: partError } = await supabase
      .from('participants')
      .insert({
        room_id: roomData.id,
        user_id: userId,
        user_name: userName,
        team_name: selectedTeam,
        budget: 120.00
      });

    if (partError) {
      alert("Failed to register host: " + partError.message);
      return;
    }

    // 3. Populate players into room_players (filtered by sets and shuffled within sets)
    const filteredPlayers = initialPlayers.filter(p => p.set_index <= numSets);
    const shuffled = [];
    for (let s = 1; s <= numSets; s++) {
      const setPlayers = filteredPlayers.filter(p => p.set_index === s).sort(() => Math.random() - 0.5);
      shuffled.push(...setPlayers);
    }

    const shuffledPlayers = shuffled.map((p, idx) => ({
        room_id: roomData.id,
        player_id: p.id,
        name: p.name,
        role: p.role,
        country: p.country,
        rating: p.rating,
        base_price: p.basePrice,
        stats: p.stats,
        description: p.description,
        set_index: p.set_index,
        set_name: p.set_name,
        status: 'available',
        order_index: idx
      }));

    const { error: playersError } = await supabase
      .from('room_players')
      .insert(shuffledPlayers);

    if (playersError) {
      alert("Failed to load player database: " + playersError.message);
      return;
    }

    setRoomCode(code);
    setRoomId(roomData.id);
    setIsHost(true);
    setView('lobby');
  };

  // User Action: Join Room
  const handleJoinRoomOnline = async () => {
    if (!roomCode || !userName || !selectedTeam) {
      alert("Please fill in Room Code, Username, and Select a Franchise.");
      return;
    }

    // 1. Find Room Code
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) {
      alert("Invalid Room Code.");
      return;
    }



    // 2. Check if Team is already selected
    const { data: teamData } = await supabase
      .from('participants')
      .select('id')
      .eq('room_id', roomData.id)
      .eq('team_name', selectedTeam)
      .limit(1);

    if (teamData && teamData.length > 0) {
      alert("Franchise is already taken in this room. Please select another.");
      return;
    }

    // 3. Add Participant
    const { error: partError } = await supabase
      .from('participants')
      .insert({
        room_id: roomData.id,
        user_id: userId,
        user_name: userName,
        team_name: selectedTeam,
        budget: 120.00
      });

    if (partError) {
      alert("Failed to join room: (You might be already registered) " + partError.message);
      return;
    }

    setRoomId(roomData.id);
    setIsHost(roomData.host_id === userId);
    setView('lobby');
  };

  // Host Action: Start Auction Room
  const handleStartAuctionOnline = async () => {
    // 1. Fill missing teams with bots
    const selectedTeams = participants.map(p => p.team_name);
    const missingFranchises = FRANCHISES.filter(f => !selectedTeams.includes(f.id));
    
    if (missingFranchises.length > 0) {
      const botParticipants = missingFranchises.map(f => ({
        room_id: roomId,
        user_id: `bot_${f.id}`,
        user_name: `${f.name} Bot (CPU)`,
        team_name: f.id,
        budget: 120.00
      }));

      const { error: botError } = await supabase
        .from('participants')
        .insert(botParticipants);

      if (botError) {
        alert("Failed to populate bot participants: " + botError.message);
        return;
      }
    }

    // Refresh participants list local state immediately
    const { data: updatedParts } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    
    if (updatedParts) {
      setParticipants(updatedParts);
    }

    // 2. Get the first available player
    const nextPlayer = roomPlayers.find(p => p.status === 'available');
    if (!nextPlayer) {
      alert("No available players found.");
      return;
    }

    const timerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).toISOString(); // 15s bidding timer

    const { error } = await supabase
      .from('rooms')
      .update({
        status: 'active',
        current_player_id: nextPlayer.player_id,
        current_bid: 0,
        current_bidder: null,
        bid_timer_ends: timerEnds
      })
      .eq('id', roomId);

    if (error) {
      alert("Failed to start auction: " + error.message);
    }
  };


  // User Bidding online
  const handlePlaceBidOnline = async () => {
    const curPlayer = roomPlayers.find(p => p.player_id === roomState.current_player_id);
    if (!curPlayer || roomState.status !== 'active') return;

    // Validate budget
    const bidderRecord = participants.find(p => p.team_name === selectedTeam);
    if (!bidderRecord) return;

    const currentPrice = roomState.current_bid || 0;
    const basePrice = curPlayer.base_price;
    const nextBid = getNextBidAmount(currentPrice, basePrice);

    if (bidderRecord.budget < nextBid) {
      alert("Insufficient budget! You cannot afford this bid.");
      return;
    }

    // Guard: Prevent self-bidding if already highest bidder
    if (roomState.current_bidder === selectedTeam) {
      return;
    }

    const newTimerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).toISOString(); // Extend timer by 15s on bid

    // Optimistically log locally, but push transaction to DB
    const { error: bidErr } = await supabase
      .from('bids_log')
      .insert({
        room_id: roomId,
        player_id: curPlayer.player_id,
        team_name: selectedTeam,
        bid_amount: nextBid
      });

    if (bidErr) return;

    // Update Room current bid and bidder
    await supabase
      .from('rooms')
      .update({
        current_bid: nextBid,
        current_bidder: selectedTeam,
        bid_timer_ends: newTimerEnds
      })
      .eq('id', roomId);
  };

  // Host Action: Timer finished - sold or unsold
  const handlePlayerSoldOrUnsoldOnline = async () => {
    const curPlayer = roomPlayers.find(p => p.player_id === roomState.current_player_id);
    if (!curPlayer) return;

    const bidder = roomState.current_bidder;
    const price = roomState.current_bid;

    setGavelStrike(true);
    setTimeout(() => setGavelStrike(false), 800);

    if (bidder && price > 0) {
      // 1. Sold! Update Player Table in DB
      await supabase
        .from('room_players')
        .update({
          status: 'sold',
          sold_price: price,
          sold_to: bidder
        })
        .eq('room_id', roomId)
        .eq('player_id', curPlayer.player_id);

      // 2. Fetch latest budget and subtract
      const { data: buyer } = await supabase
        .from('participants')
        .select('budget')
        .eq('room_id', roomId)
        .eq('team_name', bidder)
        .single();
        
      if (buyer) {
        const newBudget = Number((buyer.budget - price).toFixed(2));
        await supabase
          .from('participants')
          .update({ budget: newBudget })
          .eq('room_id', roomId)
          .eq('team_name', bidder);
      }
      
      triggerSound('sold');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } else {
      // Unsold!
      await supabase
        .from('room_players')
        .update({
          status: 'unsold'
        })
        .eq('room_id', roomId)
        .eq('player_id', curPlayer.player_id);

      triggerSound('unsold');
    }

    // Fetch next player directly from DB to avoid stale state
    const { data: updatedPlayers } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'available')
      .neq('player_id', curPlayer.player_id);

    const nextPlayer = updatedPlayers?.length > 0 ? updatedPlayers[0] : null;

    if (nextPlayer) {
      // Transition to next player after a short 3s pause
      setTimeout(async () => {
        isProcessingRef.current = false;
        const nextTimerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).toISOString();
        await supabase
          .from('rooms')
          .update({
            current_player_id: nextPlayer.player_id,
            current_bid: 0,
            current_bidder: null,
            bid_timer_ends: nextTimerEnds
          })
          .eq('id', roomId);
      }, 3000);
    } else {
      // Finish Auction
      setTimeout(async () => {
        isProcessingRef.current = false;
        await supabase
          .from('rooms')
          .update({
            status: 'finished'
          })
          .eq('id', roomId);
      }, 3000);
    }
  };

  // Host Action: Skip/Pause
  const handleHostControlOnline = async (action) => {
    if (!isHost) return;

    if (action === 'pause') {
      await supabase.from('rooms').update({ status: 'paused' }).eq('id', roomId);
    } else if (action === 'resume') {
      const nextTimer = new Date(new Date().getTime() + timeLeft * 1000).toISOString();
      await supabase.from('rooms').update({ status: 'active', bid_timer_ends: nextTimer }).eq('id', roomId);
    } else if (action === 'skip') {
      // Mark current as unsold immediately
      handlePlayerSoldOrUnsoldOnline();
    }
  };


  // Place bid on behalf of online bots
  const placeBidOnline = async (botTeam, bidAmount, playerId) => {
    // 1. Log bid to bids_log
    const { error: logErr } = await supabase
      .from('bids_log')
      .insert({
        room_id: roomId,
        player_id: playerId,
        team_name: botTeam,
        bid_amount: bidAmount
      });

    if (logErr) {
      console.error("Failed bot bid log:", logErr);
      return;
    }

    // 2. Update room bid & bidder
    const newTimerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).toISOString();
    const { error: roomErr } = await supabase
      .from('rooms')
      .update({
        current_bid: bidAmount,
        current_bidder: botTeam,
        bid_timer_ends: newTimerEnds
      })
      .eq('id', roomId);

    if (roomErr) {
      console.error("Failed bot room state update:", roomErr);
    }
  };

  // --- UNIFIED AI BIDDING ENGINE ---

  const runAIBidding = () => {
    if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);
    if (roomState.status !== 'active') return;

    const currentPlayer = roomPlayers.find(p => 
      p.player_id === roomState.current_player_id || 
      p.id === roomState.current_player_id
    );
    if (!currentPlayer) return;

    const currentBid = roomState.current_bid || 0;
    const basePrice = currentPlayer.base_price || currentPlayer.basePrice;
    const nextBid = getNextBidAmount(currentBid, basePrice);

    // Filter eligible bot participants (excluding the current highest bidder)
    const bots = participants.filter(p => {
      const isBot = p.isBot || (p.user_id && p.user_id.startsWith('bot_'));
      return isBot && p.team_name !== roomState.current_bidder;
    });

    if (bots.length === 0) return;

    // Filter bots that are interested and can afford the bid
    const interestedBots = bots.filter(b => {
      const valuation = getBotValuation(currentPlayer, b.team_name);
      
      // Roster checks
      const squad = roomPlayers.filter(pl => pl.sold_to === b.team_name);
      const squadCount = squad.length;
      const isOverseas = currentPlayer.country !== 'India';
      const overseasCount = squad.filter(pl => pl.country !== 'India').length;
      
      // Safety reserve (ensure bot keeps enough budget for min 18 players)
      const minSquadShortfall = Math.max(0, 18 - squadCount - 1);
      const safetyReserve = minSquadShortfall * 0.30;

      return (
        nextBid <= valuation &&
        b.budget >= nextBid &&
        squadCount < 25 &&
        (!isOverseas || overseasCount < 8) &&
        (b.budget - nextBid >= safetyReserve)
      );
    });

    if (interestedBots.length === 0) return;

    // Choose one random bot from interested bots
    const randomBot = interestedBots[Math.floor(Math.random() * interestedBots.length)];
    
    // Random delay (1.5s to 3.5s) to simulate thinking
    const delay = Math.random() * 2000 + 1500;

    aiBidTimeoutRef.current = setTimeout(() => {
      if (gameMode === 'online') {
        placeBidOnline(randomBot.team_name, nextBid, currentPlayer.player_id);
      } else {
        placeBidOffline(randomBot.team_name, nextBid, currentPlayer.id);
      }
    }, delay);
  };

  // AI Bidding Scheduler Hook (only runs for the Host / Single Player)
  useEffect(() => {
    if (!isHost || roomState.status !== 'active') {
      if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);
      return;
    }

    runAIBidding();

    return () => {
      if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);
    };
  }, [
    isHost,
    roomState.status, 
    roomState.current_player_id, 
    roomState.current_bid, 
    roomState.current_bidder, 
    participants, 
    roomPlayers
  ]);

  // --- OFFLINE GAME MODE: SANDBOX WITH AI BOTS ---


  // Handle Offline Lobby Start
  const handleCreateRoomOffline = () => {
    if (!userName || !selectedTeam) {
      alert("Please enter a username and select your franchise.");
      return;
    }

    // Set up CPU Bots for selected franchises
    const availableFranchises = FRANCHISES.filter(f => f.id !== selectedTeam && selectedBotTeams.includes(f.id));
    const bots = availableFranchises.map((f, index) => ({
      id: `bot_${f.id}`,
      user_id: `bot_${f.id}`,
      user_name: `${f.name} Bot`,
      team_name: f.id,
      budget: 120.00,
      isBot: true
    }));

    const userParticipant = {
      id: 'human_user',
      user_id: userId,
      user_name: userName,
      team_name: selectedTeam,
      budget: 120.00,
      isBot: false
    };

    const allParticipants = [userParticipant, ...bots];
    setOfflineParticipants(allParticipants);
    setParticipants(allParticipants);

    // Filter by sets and shuffle within each set
    const filteredPlayers = initialPlayers.filter(p => p.set_index <= numSets);
    const shuffled = [];
    for (let s = 1; s <= numSets; s++) {
      const setPlayers = filteredPlayers.filter(p => p.set_index === s).sort(() => Math.random() - 0.5);
      shuffled.push(...setPlayers);
    }
    
    const finalPlayers = shuffled.map((p, idx) => ({ ...p, base_price: p.basePrice, status: 'available', sold_price: null, sold_to: null, order_index: idx }));
    
    setRoomPlayers(finalPlayers);
    setOfflinePlayers(finalPlayers);

    setRoomState({
      status: 'lobby',
      current_player_id: null,
      current_bid: 0,
      current_bidder: null,
      bid_timer_ends: null,
      host_id: userId
    });
    setRoomCode('SANDBX');
    setIsHost(true);
    setView('lobby');
  };

  const handleStartAuctionOffline = () => {
    const nextPlayer = roomPlayers.find(p => p.status === 'available');
    if (!nextPlayer) return;

    const timerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).getTime();
    
    setRoomState({
      status: 'active',
      current_player_id: nextPlayer.id,
      current_bid: 0,
      current_bidder: null,
      bid_timer_ends: timerEnds,
      host_id: userId
    });
    setTimeLeft(timerDuration);
    setView('auction');

    // Add initial commentary
    setComments([
      {
        id: Math.random().toString(),
        team: 'SYSTEM',
        text: `Hammer down! Bidding starts for ${nextPlayer.name} (Base Price: ${nextPlayer.basePrice} Cr)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'system'
      }
    ]);
  };

  // Human / Bot places bid offline
  const placeBidOffline = (bidderTeam, bidAmount, playerId) => {
    const activePlayer = roomPlayers.find(p => p.id === playerId);
    if (!activePlayer) return;

    // Update RoomState
    const newTimerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).getTime();
    setRoomState(prev => ({
      ...prev,
      current_bid: bidAmount,
      current_bidder: bidderTeam,
      bid_timer_ends: newTimerEnds
    }));
    setTimeLeft(timerDuration);
    triggerSound('bid');

    // Add bid log comment
    const bidId = Math.random().toString();
    const commentsList = [
      {
        id: bidId,
        team: bidderTeam,
        text: `Bid ${bidAmount} Cr for ${activePlayer.name}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'bid'
      },
      ...comments
    ];
    setComments(commentsList);
    setOfflineBidsLog(prev => [...prev, { id: bidId, player_id: playerId, team_name: bidderTeam, bid_amount: bidAmount }]);
  };

  const handlePlaceBidOffline = () => {
    const curPlayer = roomPlayers.find(p => p.id === roomState.current_player_id);
    if (!curPlayer) return;

    const bidderRecord = participants.find(p => p.team_name === selectedTeam);
    if (!bidderRecord) return;

    const currentPrice = roomState.current_bid || 0;
    const nextBid = getNextBidAmount(currentPrice, curPlayer.base_price);

    if (bidderRecord.budget < nextBid) {
      alert("Insufficient budget! You cannot afford this bid.");
      return;
    }

    if (roomState.current_bidder === selectedTeam) return;

    placeBidOffline(selectedTeam, nextBid, curPlayer.id);
  };

  const handlePlayerSoldOrUnsoldOffline = () => {
    if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);

    const curPlayer = roomPlayers.find(p => p.id === roomState.current_player_id);
    if (!curPlayer) return;

    const bidder = roomState.current_bidder;
    const price = roomState.current_bid;

    setGavelStrike(true);
    setTimeout(() => setGavelStrike(false), 800);

    // Update locally stored players array
    const updatedPlayers = roomPlayers.map(p => {
      if (p.id === curPlayer.id) {
        return {
          ...p,
          status: bidder && price > 0 ? 'sold' : 'unsold',
          sold_price: bidder && price > 0 ? price : null,
          sold_to: bidder && price > 0 ? bidder : null
        };
      }
      return p;
    });

    setRoomPlayers(updatedPlayers);
    setOfflinePlayers(updatedPlayers);

    // Subtract budget from bidder participant
    if (bidder && price > 0) {
      const updatedParts = participants.map(p => {
        if (p.team_name === bidder) {
          return { ...p, budget: Number((p.budget - price).toFixed(2)) };
        }
        return p;
      });
      setParticipants(updatedParts);
      setOfflineParticipants(updatedParts);

      triggerSound('sold');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } else {
      triggerSound('unsold');
    }

    // Get next available player
    const nextPlayer = updatedPlayers.find(p => p.status === 'available');

    if (nextPlayer) {
      // Pause 3 seconds, then present next player
      setTimeout(() => {
        isProcessingRef.current = false;
        const timerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).getTime();
        setRoomState(prev => ({
          ...prev,
          current_player_id: nextPlayer.id,
          current_bid: 0,
          current_bidder: null,
          bid_timer_ends: timerEnds
        }));
        setTimeLeft(timerDuration);
        
        // Push commentary
        setComments(prev => [
          {
            id: Math.random().toString(),
            team: 'SYSTEM',
            text: `Hammer down! Bidding starts for ${nextPlayer.name} (Base Price: ${nextPlayer.basePrice} Cr)`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'system'
          },
          ...prev
        ]);
      }, 3000);
    } else {
      setTimeout(() => {
        isProcessingRef.current = false;
        setRoomState(prev => ({ ...prev, status: 'finished' }));
        setView('summary');
      }, 3000);
    }
  };

  const handleHostControlOffline = (action) => {
    if (action === 'pause') {
      if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);
      setRoomState(prev => ({ ...prev, status: 'paused' }));
    } else if (action === 'resume') {
      const nextTimer = new Date(new Date().getTime() + timeLeft * 1000).getTime();
      setRoomState(prev => ({ ...prev, status: 'active', bid_timer_ends: nextTimer }));
    } else if (action === 'skip') {
      handlePlayerSoldOrUnsoldOffline();
    }
  };


  // General Bid Calculator
  const getNextBidAmount = (currentBid, basePrice) => {
    const activePrice = Math.max(currentBid, basePrice);
    if (activePrice < 2.0) return Number((activePrice + 0.10).toFixed(2));
    if (activePrice < 5.0) return Number((activePrice + 0.20).toFixed(2));
    if (activePrice < 10.0) return Number((activePrice + 0.50).toFixed(2));
    return Number((activePrice + 1.00).toFixed(2));
  };


  // --- UNIVERSAL TRANSITIONS ---

  // Handle exiting room back to landing
  const handleLeaveRoom = () => {
    if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setView('landing');
    setRoomCode('');
    setRoomId(null);
    setParticipants([]);
    setRoomPlayers([]);
  };

  // Local Chat / Message Ticker input
  const handleSendComment = () => {
    if (!commentInput.trim()) return;

    const newComment = {
      id: Math.random().toString(),
      team: selectedTeam || 'SPECTATOR',
      text: commentInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'chat'
    };
    
    setComments([newComment, ...comments]);
    setCommentInput('');
  };


  // --- SQUAD EVALUATION LOGIC (Leaderboard & Dream XI) ---

  const calculateSquadRating = (teamId) => {
    const squad = roomPlayers.filter(p => p.sold_to === teamId);
    if (squad.length === 0) return 0;
    
    // Average rating
    const avgRating = Math.round(squad.reduce((sum, p) => sum + p.rating, 0) / squad.length);
    return avgRating;
  };

  const getTeamSquadCount = (teamId) => {
    return roomPlayers.filter(p => p.sold_to === teamId).length;
  };

  const getOverseasCount = (teamId) => {
    return roomPlayers.filter(p => p.sold_to === teamId && p.country !== 'India').length;
  };

  const getRoleBreakdown = (teamId) => {
    const squad = roomPlayers.filter(p => p.sold_to === teamId);
    const bat = squad.filter(p => p.role === 'Batsman').length;
    const bowl = squad.filter(p => p.role === 'Bowler').length;
    const ar = squad.filter(p => p.role === 'All-Rounder').length;
    const wk = squad.filter(p => p.role === 'Wicketkeeper').length;
    return `${bat} BAT • ${wk} WK • ${ar} AR • ${bowl} BOWL`;
  };


  // --- VIEW RENDERING HELPERS ---

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="font-display" style={{ color: '#d97706', fontWeight: 'bold', fontSize: '24px', letterSpacing: '0.02em', textShadow: '0 0 10px rgba(245, 158, 11, 0.2)' }}>
            IPL MEGA AUCTION
          </div>
          <span className="font-display" style={{ backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '11px', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
            Live Simulator
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live indicator */}
          {view !== 'landing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
              <div className={gameMode === 'online' ? "live-pulse" : ""} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: gameMode === 'online' ? '#ef4444' : '#fb923c' }} />
              <span style={{ color: '#475569', fontWeight: '600', letterSpacing: '0.05em' }}>
                {gameMode === 'online' ? `ONLINE (ROOM: ${roomCode})` : 'LOCAL SANDBOX'}
              </span>
            </div>
          )}

          {/* Sound Control */}
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            style={{ padding: '8px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '50%', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {view !== 'landing' && (
            <button 
              onClick={handleLeaveRoom}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
            >
              <LogOut size={16} /> Leave
            </button>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col justify-center">
        
        {/* 1. LANDING SCREEN */}
        {view === 'landing' && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 my-8 items-stretch">
            
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

              <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b', position: 'relative', zIndex: 10 }}>
                Created with React, Vite, and Supabase.
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
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sets to Auction</label>
                      <span style={{ fontSize: '10px', color: '#d97706', backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{numSets === 8 ? 'ALL SETS' : `UP TO SET ${numSets}`}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={numSets} 
                      onChange={(e) => setNumSets(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: 'bold' }}>
                      <span>1 (Batters Only)</span>
                      <span>8 (Full Pool)</span>
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
          </div>
        )}

        {/* 2. LOBBY SCREEN */}
        {view === 'lobby' && (
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
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontStyle: 'italic', fontWeight: '500' }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#d97706' }} />
                  Waiting for host to start...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. AUCTION ROOM SCREEN */}
        {(view === 'auction' || (view === 'lobby' && roomState.status === 'active')) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-start">
            
            {/* Top row: Active Bid Area (Spans full width) */}
            <div className="lg:col-span-3">
              
              {/* CURRENT PLAYER CARD */}
              {(() => {
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
                const timerPercentage = roomState.status === 'active' ? (timeLeft / timerDuration) * 100 : 0;
                const timerColor = timeLeft > 8 ? 'bg-emerald-500' : timeLeft > 4 ? 'bg-amber-500' : 'bg-rose-500';

                return (
                  <div className="glass-panel p-6 relative overflow-hidden flex flex-col justify-between min-h-[460px] active-bidder-glow">
                    {/* Background accent ring */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                          <span style={{ backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                            {currentPlayer.set_name || `SET ${currentPlayer.set_index}`}
                          </span>
                          <h2 className="font-display" style={{ fontSize: '48px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0f172a', margin: 0, lineHeight: 1 }}>
                            {currentPlayer.name}
                          </h2>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
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
                      <div style={{ flex: '1 1 30%', minWidth: '250px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Highest Bid</span>
                          {roomState.current_bid > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                              <span className="font-display" style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669', lineHeight: '1' }}>
                                ₹{roomState.current_bid} <span style={{fontSize:'16px', fontWeight:'700', color: '#047857'}}>Cr</span>
                              </span>
                              <span 
                                className="font-display"
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
                        {roomState.status === 'active' ? (
                          <>
                            <button
                              onClick={gameMode === 'online' ? handlePlaceBidOnline : handlePlaceBidOffline}
                              disabled={isUnderfunded || isHighestBidder}
                              className={`w-full font-display uppercase tracking-wider transition border-none cursor-pointer ${
                                isHighestBidder 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 cursor-not-allowed' 
                                  : isUnderfunded 
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-amber-500/20'
                              }`}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1, padding: '16px', borderRadius: '12px' }}
                            >
                              {isHighestBidder ? (
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
                              <span className={`text-xs font-bold font-display w-8 text-right ${timerColor.replace('bg-', 'text-')}`}>
                                {timeLeft}s
                              </span>
                              <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                <div 
                                  className={`h-full transition-all duration-200 ease-linear ${timerColor}`}
                                  style={{ width: `${timerPercentage}%` }}
                                />
                              </div>
                            </div>
                          </>
                        ) : roomState.status === 'sold' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', padding: '16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#047857', letterSpacing: '0.05em', textTransform: 'uppercase' }}>PLAYER SOLD</span>
                            <span className="font-display" style={{ fontSize: '24px', fontWeight: 'bold', color: '#064e3b' }}>₹{roomState.current_bid} Cr</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>to {roomState.current_bidder}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#fef2f2', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px' }}>
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

            {/* Bottom Row - Left Column: Franchise Squad Board (Spans 2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* SQUAD BOARD / LEADERBOARD */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold font-display text-white mb-4">FRANCHISE BOARD</h3>
                
                <div className="space-y-3">
                  {participants.map(p => {
                    const teamInfo = FRANCHISES.find(f => f.id === p.team_name);
                    const isUserTeam = p.team_name === selectedTeam;
                    const squadCount = getTeamSquadCount(p.team_name);
                    const overseasCount = getOverseasCount(p.team_name);
                    
                    const teamSquad = roomPlayers.filter(player => player.sold_to === p.team_name);
                    const batCount = teamSquad.filter(player => player.role === 'Batsman').length;
                    const bowlCount = teamSquad.filter(player => player.role === 'Bowler').length;
                    const arCount = teamSquad.filter(player => player.role === 'All-Rounder').length;
                    const wkCount = teamSquad.filter(player => player.role === 'Wicketkeeper').length;

                    return (
                      <div 
                        key={p.id} 
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
              
              {/* GAME CONTROLS (FOR ALL HUMANS, SKIP IS HOST ONLY) */}
              <div style={{ backgroundColor: '#fffbeb', padding: '24px', borderRadius: '16px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 'bold', color: '#b45309', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Settings size={18} /> GAME CONTROLS
                  </h3>
                  {isHost ? (
                    <span className="font-display" style={{ fontSize: '10px', color: '#e11d48', backgroundColor: '#ffe4e6', border: '1px solid #fecdd3', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Host Admin
                    </span>
                  ) : (
                    <span className="font-display" style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Participant Mode
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {roomState.status === 'active' ? (
                    <button 
                      onClick={() => gameMode === 'online' ? handleHostControlOnline('pause') : handleHostControlOffline('pause')}
                      style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#ffffff', border: '1px solid #fcd34d', borderRadius: '10px', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(217, 119, 6, 0.05)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#fcd34d'; }}
                    >
                      <Square size={14} /> PAUSE TIMER
                    </button>
                  ) : (
                    <button 
                      onClick={() => gameMode === 'online' ? handleHostControlOnline('resume') : handleHostControlOffline('resume')}
                      style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#059669', backgroundColor: '#ffffff', border: '1px solid #6ee7b7', borderRadius: '10px', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.05)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ecfdf5'; e.currentTarget.style.borderColor = '#34d399'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#6ee7b7'; }}
                    >
                      <Play size={14} /> RESUME TIMER
                    </button>
                  )}

                  {isHost && (
                    <button 
                      onClick={() => gameMode === 'online' ? handleHostControlOnline('skip') : handleHostControlOffline('skip')}
                      style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#e11d48', backgroundColor: '#ffffff', border: '1px solid #fda4af', borderRadius: '10px', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(225, 29, 72, 0.05)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ffe4e6'; e.currentTarget.style.borderColor = '#fb7185'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#fda4af'; }}
                    >
                      <SkipForward size={14} /> FORCE SELL/UNSOLD
                    </button>
                  )}
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
        )}

        {/* 4. SUMMARY / LEADERBOARD END SCREEN */}
        {view === 'summary' && (
          <div className="max-w-4xl mx-auto w-full glass-panel p-8 my-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="text-center mb-8">
              <Trophy size={48} className="text-amber-500 mx-auto mb-2 animate-bounce" />
              <h2 className="text-4xl font-bold font-display text-white">MEGA AUCTION SUMMARY</h2>
              <p className="text-slate-400 text-sm">
                All players have been auctioned. Here is the final board:
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

                      return (
                        <tr key={p.id}>
                          <td className="font-display font-bold text-lg text-white">#{idx + 1}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <TeamLogo teamId={teamInfo?.id} className="w-8 h-8" />
                              <div className="hidden items-center justify-center w-8 h-8 bg-slate-800 rounded-full text-[10px] font-bold">{teamInfo?.id}</div>
                              <div>
                                <span className="font-semibold text-white block">{p.user_name}</span>
                                <span 
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded font-display mt-0.5 inline-block"
                                  style={{ backgroundColor: teamInfo?.color, color: teamInfo?.text }}
                                >
                                  {p.team_name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="font-bold text-white font-display">₹{p.budget} Cr</td>
                          <td className="text-slate-300 font-display">{squadCount}/25</td>
                          <td className="text-slate-300 font-display">{overseasCount}/8</td>
                          <td className="text-amber-500 font-bold font-display text-lg">{squadRating}</td>
                          <td>
                            {complies ? (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">
                                Valid Squad
                              </span>
                            ) : (
                              <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase" title="Must have 18-25 players and max 8 overseas">
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

            {/* Individual Squad details */}
            <div className="glass-panel p-6 mb-8">
              <h3 className="text-lg font-bold font-display text-white mb-4">YOUR SQUAD ROSTER ({getTeamSquadCount(selectedTeam)} players)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {roomPlayers
                  .filter(p => p.sold_to === selectedTeam)
                  .map(p => (
                    <div key={p.id || p.player_id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white text-xs block truncate max-w-[120px]">{p.name}</span>
                        <span className={`text-[8px] badge ${p.role === 'Batsman' ? 'badge-batsman' : p.role === 'Bowler' ? 'badge-bowler' : p.role === 'All-Rounder' ? 'badge-ar' : 'badge-wk'}`}>
                          {p.role}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-800/40">
                        <span className="text-amber-500 font-bold font-display">Rating: {p.rating}</span>
                        <span className="text-slate-400 font-display">Cost: ₹{p.sold_price} Cr</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleLeaveRoom}
                className="btn-primary"
              >
                BACK TO HOME <RotateCcw size={18} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '32px 24px', borderTop: '1px solid #e2e8f0', marginTop: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: '#f8fafc' }}>
        <span style={{ fontWeight: '500' }}>© {new Date().getFullYear()} IPL Mega Auction Simulator. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#0f172a'} onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}>Rules</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#0f172a'} onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}>Privacy Policy</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#0f172a'} onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}>Terms of Use</a>
        </div>
      </footer>
    </div>
  );
}
