import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Users, User, ArrowRight, Play, Square, SkipForward, RotateCcw, 
  Volume2, VolumeX, ShieldAlert, Award, Globe, DollarSign, ListFilter,
  CheckCircle, Plus, Send, AlertTriangle, RefreshCw, LogOut
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { players as initialPlayers } from './data/players';
import confetti from 'canvas-confetti';

// IPL Franchise List
const FRANCHISES = [
  { id: 'CSK', name: 'Chennai Super Kings', color: '#F7D117', text: '#1e1b4b', logo: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: '#004BA0', text: '#ffffff', logo: '🌪️' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24', text: '#ffffff', logo: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: '#3A225D', text: '#ffffff', logo: '⚔️' },
  { id: 'RR', name: 'Rajasthan Royals', color: '#EA1B85', text: '#ffffff', logo: '🏰' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: '#F26522', text: '#ffffff', logo: '🦅' },
  { id: 'DC', name: 'Delhi Capitals', color: '#1B3E8F', text: '#ffffff', logo: '🐯' },
  { id: 'LSG', name: 'Lucknow Super Giants', color: '#00A9E0', text: '#0f172a', logo: '✈️' },
  { id: 'GT', name: 'Gujarat Titans', color: '#0B2240', text: '#ffffff', logo: '⚡' },
  { id: 'PBKS', name: 'Punjab Kings', color: '#D71920', text: '#ffffff', logo: '🦁' }
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

  // Refs for realtime subscriptions & timers
  const roomSubscriptionRef = useRef(null);
  const participantsSubscriptionRef = useRef(null);
  const playersSubscriptionRef = useRef(null);
  const bidsSubscriptionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const aiBidTimeoutRef = useRef(null);

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
        if (updated.current_bid > roomState.current_bid) {
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

      if (diff === 0) {
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
    const commentsList = [
      {
        id: bid.id,
        team: bid.team_name,
        text: `Bid ${bid.bid_amount} Cr for ${pName}`,
        time: new Date(bid.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'bid'
      },
      ...comments
    ];
    setComments(commentsList);
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

    // 3. Populate players into room_players (shuffled to randomize auction)
    const shuffledPlayers = [...initialPlayers]
      .sort(() => Math.random() - 0.5)
      .map((p, idx) => ({
        room_id: roomData.id,
        player_id: p.id,
        name: p.name,
        role: p.role,
        country: p.country,
        rating: p.rating,
        base_price: p.basePrice,
        stats: p.stats,
        description: p.description,
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
      alert("Room not found. Please check the code.");
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

    const timerEnds = new Date(new Date().getTime() + 15000).toISOString(); // 15s bidding timer

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

    const newTimerEnds = new Date(new Date().getTime() + 10000).toISOString(); // Extend timer by 10s on bid

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

      // 2. Subtract budget from bidder
      const buyer = participants.find(p => p.team_name === bidder);
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

    // Fetch next player
    const nextPlayer = roomPlayers.find(p => p.status === 'available' && p.player_id !== curPlayer.player_id);

    if (nextPlayer) {
      // Transition to next player after a short 3s pause
      setTimeout(async () => {
        const nextTimerEnds = new Date(new Date().getTime() + 15000).toISOString();
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
    const newTimerEnds = new Date(new Date().getTime() + 10000).toISOString();
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

    // Set up 9 CPU Bots for other franchises
    const availableFranchises = FRANCHISES.filter(f => f.id !== selectedTeam);
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

    // Shuffle offline players
    const shuffled = [...initialPlayers]
      .sort(() => Math.random() - 0.5)
      .map(p => ({ ...p, status: 'available', sold_price: null, sold_to: null }));
    
    setRoomPlayers(shuffled);
    setOfflinePlayers(shuffled);

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

    const timerEnds = new Date(new Date().getTime() + 15000).getTime();
    
    setRoomState({
      status: 'active',
      current_player_id: nextPlayer.id,
      current_bid: 0,
      current_bidder: null,
      bid_timer_ends: timerEnds,
      host_id: userId
    });
    setTimeLeft(15);
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
    const newTimerEnds = new Date(new Date().getTime() + 10000).getTime();
    setRoomState(prev => ({
      ...prev,
      current_bid: bidAmount,
      current_bidder: bidderTeam,
      bid_timer_ends: newTimerEnds
    }));
    setTimeLeft(10);
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
        const timerEnds = new Date(new Date().getTime() + 15000).getTime();
        setRoomState(prev => ({
          ...prev,
          current_player_id: nextPlayer.id,
          current_bid: 0,
          current_bidder: null,
          bid_timer_ends: timerEnds
        }));
        setTimeLeft(15);
        
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
      <header className="flex justify-between items-center mb-6 glass-panel p-4 py-3 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="text-amber-500 font-bold text-3xl ipl-glow-text" style={{ fontFamily: 'var(--font-display)' }}>
            IPL MEGA AUCTION
          </div>
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs px-2 py-0.5 rounded font-display uppercase tracking-wider">
            Live Simulator
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Live indicator */}
          {view !== 'landing' && (
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <div className={gameMode === 'online' ? "live-pulse" : "w-2 h-2 rounded-full bg-orange-400"} />
              <span className="text-slate-300 font-medium">
                {gameMode === 'online' ? `ONLINE (ROOM: ${roomCode})` : 'LOCAL SANDBOX'}
              </span>
            </div>
          )}

          {/* Sound Control */}
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-full border border-slate-700 transition"
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {view !== 'landing' && (
            <button 
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut size={14} /> Leave
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
            <div className="glass-panel p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
              <div>
                <Trophy size={48} className="text-amber-500 mb-6" />
                <h1 className="text-4xl font-bold mb-4 leading-tight text-white">
                  Assemble Your <span className="text-amber-500">Dream IPL Squad</span>
                </h1>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Manage finances, bid strategically against bots or live players, and build a high-performance squad under standard IPL salary cap and team composition limits.
                </p>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span>₹120 Crore budget cap</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span>Real 2025/2026 player star pool</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span>Real-time multiplayer database synchronization</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span>Smart AI bidding agents (Sandbox mode)</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-500">
                Created with React, Vite, and Supabase.
              </div>
            </div>

            {/* Right side form */}
            <div className="glass-panel p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-6 text-white font-display">GET STARTED</h2>
                
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setGameMode('offline')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${gameMode === 'offline' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Local Sandbox (Bots)
                  </button>
                  <button 
                    onClick={() => {
                      if (!supabaseConnected) {
                        alert("Supabase keys are not set up or configured. Running in Local Sandbox instead.");
                        return;
                      }
                      setGameMode('online');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${gameMode === 'online' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Online Multiplayer
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Manager Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter your name" 
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)} 
                      className="input-field"
                    />
                  </div>

                  {/* Franchise choice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Select Your Franchise</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {FRANCHISES.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedTeam(f.id)}
                          className={`py-2 rounded-lg font-bold border transition ${selectedTeam === f.id ? `border-amber-500 bg-amber-500/20 text-amber-400 scale-105 shadow-lg` : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white'}`}
                          title={f.name}
                        >
                          <span className="block text-lg">{f.logo}</span>
                          <span className="text-[10px] block">{f.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {gameMode === 'online' && (
                    <div className="pt-2 border-t border-slate-800">
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Room Code (To Join)</label>
                      <input 
                        type="text" 
                        placeholder="ENTER 6-CHARACTER CODE" 
                        value={roomCode} 
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())} 
                        className="input-field uppercase text-center font-bold tracking-widest text-amber-500"
                        maxLength={6}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                {gameMode === 'online' ? (
                  <>
                    <button 
                      onClick={handleJoinRoomOnline} 
                      disabled={!userName || !selectedTeam || !roomCode}
                      className="btn-secondary justify-center py-3 text-xs tracking-wider"
                    >
                      JOIN LOBBY <Users size={16} />
                    </button>
                    <button 
                      onClick={handleCreateRoomOnline} 
                      disabled={!userName || !selectedTeam}
                      className="btn-primary justify-center py-3 text-xs tracking-wider"
                    >
                      CREATE ROOM <Plus size={16} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleCreateRoomOffline} 
                    disabled={!userName || !selectedTeam}
                    className="btn-primary col-span-2 justify-center py-3 text-sm tracking-wider"
                  >
                    START SIMULATOR <Play size={18} />
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
          <div className="max-w-2xl mx-auto w-full glass-panel p-8 my-8 relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl" />
            
            <div className="text-center mb-8">
              <Users size={40} className="text-amber-500 mx-auto mb-2" />
              <h2 className="text-3xl font-bold font-display text-white">AUCTION LOBBY</h2>
              <p className="text-slate-400 text-sm">
                Wait for managers to join and claims their franchises.
              </p>
              
              <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-3 inline-block">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">ROOM CODE</span>
                <span className="text-2xl font-bold text-amber-500 font-display tracking-widest">{roomCode}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Joined Managers ({participants.length}/10)</h3>
              
              <div className="space-y-2.5">
                {participants.map(p => {
                  const teamInfo = FRANCHISES.find(f => f.id === p.team_name);
                  return (
                    <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{teamInfo?.logo}</span>
                        <div>
                          <span className="font-semibold text-white text-sm">{p.user_name}</span>
                          {p.user_id === userId && (
                            <span className="ml-2 text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">YOU</span>
                          )}
                          {p.isBot && (
                            <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">BOT</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-display px-2.5 py-1 rounded" style={{ backgroundColor: teamInfo?.color, color: teamInfo?.text }}>
                          {p.team_name}
                        </span>
                        {p.user_id === roomState.host_id && (
                          <span className="text-[9px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">HOST</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t border-slate-800">
              <button onClick={handleLeaveRoom} className="btn-secondary">
                Cancel
              </button>

              {isHost ? (
                <button 
                  onClick={gameMode === 'online' ? handleStartAuctionOnline : handleStartAuctionOffline}
                  className="btn-primary"
                >
                  START AUCTION <ArrowRight size={18} />
                </button>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                  <RefreshCw size={14} className="animate-spin text-amber-500" />
                  Waiting for host to start...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. AUCTION ROOM SCREEN */}
        {(view === 'auction' || (view === 'lobby' && roomState.status === 'active')) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-start">
            
            {/* COLUMN 1 & 2: Active Bid Area (Width span 2) */}
            <div className="lg:col-span-2 space-y-6">
              
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
                const isUnderfunded = myBidderRecord && myBidderRecord.budget < nextBidPrice;
                const isHighestBidder = roomState.current_bidder === selectedTeam;

                // Timer percentage
                const timerPercentage = roomState.status === 'active' ? (timeLeft / 15) * 100 : 0;
                const timerColor = timeLeft > 8 ? 'bg-emerald-500' : timeLeft > 4 ? 'bg-amber-500' : 'bg-rose-500';

                return (
                  <div className="glass-panel p-6 relative overflow-hidden flex flex-col justify-between min-h-[460px] active-bidder-glow">
                    {/* Background accent ring */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      {/* Timer Bar */}
                      <div className="w-full bg-slate-900/60 rounded-full h-1.5 mb-6 overflow-hidden border border-slate-800">
                        <div 
                          className={`progress-timer ${timerColor}`}
                          style={{ width: `${timerPercentage}%` }}
                        />
                      </div>

                      {/* Header details */}
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${getRoleBadgeClass(currentPlayer.role)}`}>
                            {currentPlayer.role}
                          </span>
                          <span className={`badge ${currentPlayer.country === 'India' ? 'badge-indian' : 'badge-overseas'}`}>
                            {currentPlayer.country === 'India' ? '🇮🇳 Indian' : `✈️ ${currentPlayer.country}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Base Price</span>
                          <span className="font-display font-bold text-amber-500 text-lg">₹{currentPlayer.base_price} Cr</span>
                        </div>
                      </div>

                      {/* Player details */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center my-4">
                        {/* Rating circle */}
                        <div className="flex flex-col items-center justify-center md:border-r border-slate-800 py-2">
                          <div className={`rating-circle ${currentPlayer.rating >= 92 ? 'rating-high' : 'rating-mid'}`}>
                            {currentPlayer.rating}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Rating</span>
                        </div>

                        {/* Name and desc */}
                        <div className="md:col-span-3">
                          <h2 className="text-4xl font-bold font-display text-white tracking-wide leading-tight">
                            {currentPlayer.name}
                          </h2>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed italic max-w-lg">
                            "{currentPlayer.description || 'Top tier IPL player ready to impact the season.'}"
                          </p>
                        </div>
                      </div>

                      {/* Primary Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 my-6">
                        <div className="glass-card flex flex-col justify-center p-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stat Pillar 1</span>
                          <span className="text-xl font-bold text-white font-display mt-0.5">{currentPlayer.stats?.primary || 'N/A'}</span>
                        </div>
                        <div className="glass-card flex flex-col justify-center p-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stat Pillar 2</span>
                          <span className="text-xl font-bold text-white font-display mt-0.5">{currentPlayer.stats?.secondary || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* LIVE BIDDING INFORMATION */}
                    <div className="mt-4 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      
                      {/* Current highest bidder */}
                      <div className="glass-card bg-slate-900/60 p-4 border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Current Highest Bid</span>
                          {roomState.current_bid > 0 ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-2xl font-bold text-emerald-500 font-display">
                                ₹{roomState.current_bid} Cr
                              </span>
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded font-display"
                                style={{ backgroundColor: currentBidderInfo?.color, color: currentBidderInfo?.text }}
                              >
                                {roomState.current_bidder}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-slate-500 font-display mt-1 block">
                              No Bids Yet
                            </span>
                          )}
                        </div>

                        {/* Animated hammer icon on bid */}
                        <div className={`text-4xl ${gavelStrike ? 'hammer-animation' : ''}`} style={{ transformOrigin: 'bottom right' }}>
                          🔨
                        </div>
                      </div>

                      {/* BIDDING BUTTONS */}
                      <div className="space-y-2">
                        {roomState.status === 'active' ? (
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={gameMode === 'online' ? handlePlaceBidOnline : handlePlaceBidOffline}
                              disabled={isUnderfunded || isHighestBidder}
                              className={`w-full py-4.5 rounded-xl font-bold font-display uppercase tracking-wider text-lg transition flex flex-col items-center justify-center border-none cursor-pointer ${
                                isHighestBidder 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 cursor-not-allowed' 
                                  : isUnderfunded 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-amber-500/20'
                              }`}
                            >
                              {isHighestBidder ? (
                                <>
                                  <span className="text-sm font-semibold">YOU HOLD HIGH BID</span>
                                  <span className="text-xs font-normal lowercase text-emerald-400">waiting for challengers...</span>
                                </>
                              ) : isUnderfunded ? (
                                <>
                                  <span className="text-sm font-semibold">INSUFFICIENT BUDGET</span>
                                  <span className="text-xs font-normal lowercase text-slate-500">requires ₹{nextBidPrice} Cr</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xl font-bold">PLACE BID (₹{nextBidPrice} Cr)</span>
                                  <span className="text-[10px] font-normal tracking-normal lowercase text-slate-800">raise by +₹{(nextBidPrice - Math.max(roomState.current_bid, currentPlayer.base_price)).toFixed(2)} Cr</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-slate-500 font-display text-lg uppercase">
                            ⚠️ AUCTION IS PAUSED
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* UPCOMING PLAYERS ACCORDION/LIST */}
              <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold font-display text-white">UPCOMING PLAYER LIST</h3>
                  <span className="text-xs text-slate-400">
                    {roomPlayers.filter(p => p.status === 'available').length} remaining
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto custom-scroll pr-2">
                  {roomPlayers
                    .filter(p => p.status === 'available' && p.player_id !== roomState.current_player_id && p.id !== roomState.current_player_id)
                    .map(p => (
                      <div key={p.id || p.player_id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{p.name}</span>
                          <span className="text-[10px] text-slate-400">({p.role})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold font-display">Rating {p.rating}</span>
                          <span className="text-amber-500 font-bold font-display">Base: ₹{p.base_price} Cr</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* HOST CONTROLS (COLLAPSIBLE, HOST ONLY) */}
              {isHost && (
                <div className="glass-panel p-6 border border-rose-500/20 bg-rose-500/5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold font-display text-rose-400 flex items-center gap-2">
                      <ShieldAlert size={20} /> HOST CONTROLS (ADMIN)
                    </h3>
                    <span className="text-[10px] text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-display uppercase tracking-wider font-bold">
                      Host Authorized
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {roomState.status === 'active' ? (
                      <button 
                        onClick={() => gameMode === 'online' ? handleHostControlOnline('pause') : handleHostControlOffline('pause')}
                        className="btn-secondary flex-1 justify-center py-2.5 text-xs text-amber-500 border-amber-500/20 hover:bg-amber-500/5"
                      >
                        <Square size={14} /> Pause Timer
                      </button>
                    ) : (
                      <button 
                        onClick={() => gameMode === 'online' ? handleHostControlOnline('resume') : handleHostControlOffline('resume')}
                        className="btn-secondary flex-1 justify-center py-2.5 text-xs text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/5"
                      >
                        <Play size={14} /> Resume Timer
                      </button>
                    )}

                    <button 
                      onClick={() => gameMode === 'online' ? handleHostControlOnline('skip') : handleHostControlOffline('skip')}
                      className="btn-secondary flex-1 justify-center py-2.5 text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/5"
                    >
                      <SkipForward size={14} /> Force Sell/Unsold
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 3: Live Feed & Squad Scoreboard (Width span 1) */}
            <div className="space-y-6">
              
              {/* SQUAD BOARD / LEADERBOARD */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold font-display text-white mb-4">FRANCHISE BOARD</h3>
                
                <div className="space-y-3">
                  {participants.map(p => {
                    const teamInfo = FRANCHISES.find(f => f.id === p.team_name);
                    const isUserTeam = p.team_name === selectedTeam;
                    const squadCount = getTeamSquadCount(p.team_name);
                    const overseasCount = getOverseasCount(p.team_name);
                    const avgRating = calculateSquadRating(p.team_name);

                    return (
                      <div 
                        key={p.id} 
                        className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                          isUserTeam 
                            ? 'bg-amber-500/5 border-amber-500/30' 
                            : 'bg-slate-900/40 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{teamInfo?.logo}</span>
                            <div>
                              <span className="font-semibold text-xs text-white block">
                                {p.user_name}
                              </span>
                              <span className="text-[10px] text-slate-400 leading-none">
                                {getRoleBreakdown(p.team_name)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="text-[9px] font-bold px-2 py-0.5 rounded font-display"
                              style={{ backgroundColor: teamInfo?.color, color: teamInfo?.text }}
                            >
                              {p.team_name}
                            </span>
                          </div>
                        </div>

                        {/* Stats summary */}
                        <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-slate-800/40">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Budget</span>
                            <span className="font-display font-bold text-xs text-white">₹{p.budget} Cr</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Squad</span>
                            <span className="font-display font-bold text-xs text-white">{squadCount}/25</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Overseas</span>
                            <span className={`font-display font-bold text-xs ${overseasCount > 8 ? 'text-rose-400' : 'text-white'}`}>
                              {overseasCount}/8
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Squad Rating</span>
                            <span className="font-display font-bold text-xs text-amber-500">
                              {avgRating > 0 ? `${avgRating}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIVE LOGS / COMMMENTARY / CHAT */}
              <div className="glass-panel p-6 flex flex-col justify-between min-h-[350px]">
                <div>
                  <h3 className="text-lg font-bold font-display text-white mb-4">LIVE COMMENTARY & FEED</h3>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll pr-1">
                    {comments.length === 0 ? (
                      <div className="text-center text-slate-500 py-12 text-sm italic font-display">
                        Commentary box is quiet... Waiting for bidding war.
                      </div>
                    ) : (
                      comments.map(c => {
                        const teamInfo = FRANCHISES.find(f => f.id === c.team);
                        
                        let textClass = 'text-slate-300';
                        if (c.type === 'system') textClass = 'text-amber-400 font-bold';

                        return (
                          <div key={c.id} className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40">
                            <div className="flex justify-between items-center mb-1">
                              {c.team !== 'SYSTEM' && c.team !== 'SPECTATOR' ? (
                                <span 
                                  className="text-[8px] font-bold px-1.5 py-0.5 rounded font-display"
                                  style={{ backgroundColor: teamInfo?.color, color: teamInfo?.text }}
                                >
                                  {c.team}
                                </span>
                              ) : (
                                <span className="text-[8px] text-slate-500 font-bold font-display">
                                  {c.team}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500">{c.time}</span>
                            </div>
                            <p className={textClass}>{c.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Input text */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                  <input 
                    type="text" 
                    placeholder="Send message to room..." 
                    value={commentInput} 
                    onChange={(e) => setCommentInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    className="input-field py-2 text-xs"
                  />
                  <button 
                    onClick={handleSendComment}
                    className="btn-primary py-2 px-3.5 text-xs shadow-none shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* FULL SQUAD VIEW DRAWER (WIDESPAN FOOTER) */}
            <div className="lg:col-span-3 glass-panel p-6">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h3 className="text-lg font-bold font-display text-white">ROSTER LISTING & SQUADS</h3>
                
                {/* Roster filter */}
                <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                  <button 
                    onClick={() => setShowRosterTeam('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                      showRosterTeam === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Sold
                  </button>
                  <button 
                    onClick={() => setShowRosterTeam(selectedTeam)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                      showRosterTeam === selectedTeam ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    My Squad
                  </button>
                  {FRANCHISES.filter(f => f.id !== selectedTeam).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setShowRosterTeam(f.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                        showRosterTeam === f.id ? 'bg-slate-200 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
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
                    <div className="text-center text-slate-500 py-12 text-sm italic font-display border border-dashed border-slate-800 rounded-xl">
                      No players purchased yet for this filter.
                    </div>
                  );
                }

                return (
                  <div className="responsive-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Player Name</th>
                          <th>Role</th>
                          <th>Rating</th>
                          <th>Country</th>
                          <th>Sold To</th>
                          <th>Price Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRosters.map(p => {
                          const buyerInfo = FRANCHISES.find(f => f.id === p.sold_to);
                          return (
                            <tr key={p.id || p.player_id}>
                              <td className="font-semibold text-white">{p.name}</td>
                              <td>
                                <span className={`badge ${
                                  p.role === 'Batsman' ? 'badge-batsman' : p.role === 'Bowler' ? 'badge-bowler' : p.role === 'All-Rounder' ? 'badge-ar' : 'badge-wk'
                                }`}>
                                  {p.role}
                                </span>
                              </td>
                              <td className="font-bold text-amber-500 font-display">{p.rating}</td>
                              <td className="text-slate-400 text-xs">{p.country}</td>
                              <td>
                                <span 
                                  className="text-[9px] font-bold px-2 py-0.5 rounded font-display"
                                  style={{ backgroundColor: buyerInfo?.color, color: buyerInfo?.text }}
                                >
                                  {p.sold_to}
                                </span>
                              </td>
                              <td className="font-bold font-display text-white">₹{p.sold_price} Cr</td>
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
                              <span>{teamInfo?.logo}</span>
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
      <footer className="text-center text-slate-600 text-xs py-6 border-t border-slate-900 mt-12 flex justify-between items-center flex-wrap gap-4">
        <span>© {new Date().getFullYear()} IPL Mega Auction Simulator. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-400">Rules</a>
          <a href="#" className="hover:text-slate-400">Privacy Policy</a>
          <a href="#" className="hover:text-slate-400">Terms of Use</a>
        </div>
      </footer>
    </div>
  );
}
