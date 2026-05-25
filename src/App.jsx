import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Users, User, ArrowRight, Play, Square, Pause, SkipForward, RotateCcw, 
  Volume2, VolumeX, ShieldAlert, Award, Globe, DollarSign, ListFilter, Settings,
  CheckCircle, Plus, Send, AlertTriangle, RefreshCw, LogOut
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { players as initialPlayers } from './data/players';
import confetti from 'canvas-confetti';
import TeamLogo from './components/TeamLogo';
import { FRANCHISES, BOT_STRATEGIES } from './utils/constants';
import { getBotValuation } from './utils/botLogic';
import LivePurses from './components/LivePurses';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import SummaryPage from './pages/SummaryPage';
import AuctionRoom from './pages/AuctionRoom';
import SeasonDashboard from './pages/SeasonDashboard';
import TradeMarket from './pages/TradeMarket';






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
  const [expectedPlayers, setExpectedPlayers] = useState(2);
  const [selectedSets, setSelectedSets] = useState([1,2,3,4,5,6,7,8]);
  const [showModal, setShowModal] = useState(null);
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

  // RTM State
  const [rtmCards, setRtmCards] = useState({ CSK: 2, MI: 2, RCB: 2, KKR: 2, RR: 2, SRH: 2, DC: 2, LSG: 2, GT: 2, PBKS: 2 });
  const [rtmState, setRtmState] = useState({
    isActive: false,
    playerId: null,
    player: null,
    finalBidder: null,
    finalBid: 0,
    previousTeam: null,
    timeLeft: 12
  });

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
  const lastCommentedPlayerRef = useRef(null);
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
        
        if (updated.status === 'rtm_resolved' && isHost) {
          const fetchAndNext = async () => {
            const { data: updatedPlayers } = await supabase
              .from('room_players')
              .select('*')
              .eq('room_id', roomId)
              .eq('status', 'available');

            const nextPlayer = updatedPlayers?.length > 0 ? updatedPlayers[0] : null;

            setTimeout(async () => {
              isProcessingRef.current = false;
              if (nextPlayer) {
                const nextTimerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).toISOString();
                await supabase
                  .from('rooms')
                  .update({
                    status: 'active',
                    current_player_id: nextPlayer.player_id,
                    current_bid: 0,
                    current_bidder: null,
                    bid_timer_ends: nextTimerEnds
                  })
                  .eq('id', roomId);
              } else {
                await supabase
                  .from('rooms')
                  .update({ status: 'finished' })
                  .eq('id', roomId);
              }
            }, 3000);
          };
          fetchAndNext();
        }
        
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
    if (roomState.status !== 'active' || !roomState.bid_timer_ends || rtmState.isActive) {
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
  }, [roomState.status, roomState.bid_timer_ends, roomState.current_player_id, isHost, gameMode, rtmState.isActive]);

  // Announcer commentary when a new player comes up
  useEffect(() => {
    if (roomState.status === 'active' && roomState.current_player_id) {
      if (lastCommentedPlayerRef.current !== roomState.current_player_id) {
        lastCommentedPlayerRef.current = roomState.current_player_id;
        const curPlayer = roomPlayers.find(p => p.player_id === roomState.current_player_id || p.id === roomState.current_player_id);
        if (curPlayer) {
          let trivia = "An exciting prospect enters the auction room.";
          if (curPlayer.rating >= 90) trivia = "A genuine superstar! Expect a massive bidding war for this marquee player.";
          else if (curPlayer.rating >= 85) trivia = "A highly rated player. Franchises will definitely have their eyes on this one.";
          else if (curPlayer.role === 'All-Rounder') trivia = "All-rounders are always in high demand. Let's see who opens the bidding.";
          else if (curPlayer.country !== 'India') trivia = `The overseas star from ${curPlayer.country} goes under the hammer.`;

          const msg = `Now up: ${curPlayer.name} (${curPlayer.role}). Base Price: ₹${curPlayer.base_price}Cr. ${trivia}`;
          
          setComments(prev => [
            { id: Date.now() + Math.random(), text: msg, team: 'SYSTEM', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), type: 'system' },
            ...prev
          ]);
        }
      }
    } else {
      lastCommentedPlayerRef.current = null;
    }
  }, [roomState.current_player_id, roomState.status, roomPlayers]);

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
          type: 'bid',
          player_id: b.player_id
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
      type: 'bid',
      player_id: bid.player_id
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
    const filteredPlayers = initialPlayers.filter(p => selectedSets.includes(p.set_index));
    const shuffled = [];
    for (const s of selectedSets) {
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

    setRtmCards({ CSK: 2, MI: 2, RCB: 2, KKR: 2, RR: 2, SRH: 2, DC: 2, LSG: 2, GT: 2, PBKS: 2 });
    setRtmState({ isActive: false, playerId: null, player: null, finalBidder: null, finalBid: 0, previousTeam: null, timeLeft: 12 });
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

    setRtmCards({ CSK: 2, MI: 2, RCB: 2, KKR: 2, RR: 2, SRH: 2, DC: 2, LSG: 2, GT: 2, PBKS: 2 });
    setRtmState({ isActive: false, playerId: null, player: null, finalBidder: null, finalBid: 0, previousTeam: null, timeLeft: 12 });
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

    // Check RTM eligibility first
    if (bidder && price > 0) {
      const didTrigger = triggerRTMIfEligible(curPlayer, bidder, price);
      if (didTrigger) return;
    }

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

  // Helper to get previous franchise of a player
  const getPreviousTeam = (playerName) => {
    const mapping = {
      "Virat Kohli": "RCB", "Rohit Sharma": "MI", "MS Dhoni": "CSK",
      "Suryakumar Yadav": "MI", "Yashasvi Jaiswal": "RR", "Heinrich Klassen": "SRH",
      "Heinrich Klaasen": "SRH", "Travis Head": "SRH", "Jasprit Bumrah": "MI", 
      "Rashid Khan": "GT", "Pat Cummins": "SRH", "Sunil Narine": "KKR", 
      "Andre Russell": "KKR", "Rinku Singh": "KKR", "Shubman Gill": "GT", 
      "Rishabh Pant": "DC", "KL Rahul": "LSG", "Sanju Samson": "RR", 
      "Hardik Pandya": "MI", "Ravindra Jadeja": "CSK", "Ruturaj Gaikwad": "CSK", 
      "Shivam Dube": "CSK", "Matheesha Pathirana": "CSK", "Shreyas Iyer": "KKR", 
      "Mitchell Starc": "KKR", "Yuzvendra Chahal": "RR", "Trent Boult": "RR", 
      "Nicholas Pooran": "LSG", "Axar Patel": "DC", "Kuldeep Yadav": "DC", 
      "Quinton de Kock": "LSG", "Mohammed Siraj": "RCB", "Rajat Patidar": "RCB", 
      "Dinesh Karthik": "RCB", "Faf du Plessis": "RCB", "Glenn Maxwell": "RCB", 
      "Cameron Green": "RCB", "Will Jacks": "RCB", "Ishan Kishan": "MI", 
      "Tilak Varma": "MI", "Tim David": "MI", "Gerald Coetzee": "MI", 
      "Piyush Chawla": "MI", "Phil Salt": "KKR", "Venkatesh Iyer": "KKR", 
      "Ramandeep Singh": "KKR", "Harshit Rana": "KKR", "Varun Chakaravarthy": "KKR", 
      "Jos Buttler": "RR", "Riyan Parag": "RR", "Shimron Hetmyer": "RR", 
      "Dhruv Jurel": "RR", "Ravichandran Ashwin": "RR", "Avesh Khan": "RR", 
      "Sandeep Sharma": "RR", "Abhishek Sharma": "SRH", "Nitish Kumar Reddy": "SRH", 
      "T Natarajan": "SRH", "Bhuvneshwar Kumar": "SRH", "Mayank Agarwal": "SRH", 
      "Marco Jansen": "SRH", "David Warner": "DC", "Prithvi Shaw": "DC", 
      "Jake Fraser-McGurk": "DC", "Tristan Stubbs": "DC", "Khaleel Ahmed": "DC", 
      "Mukesh Kumar": "DC", "Marcus Stoinis": "LSG", "Ayush Badoni": "LSG", 
      "Krunal Pandya": "LSG", "Ravi Bishnoi": "LSG", "Naveen-ul-Haq": "LSG", 
      "Devdutt Padikkal": "LSG", "Sai Sudharsan": "GT", "David Miller": "GT", 
      "Rahul Tewatia": "GT", "Shahrukh Khan": "GT", "Sai Kishore": "GT", 
      "Mohit Sharma": "GT", "Mohammed Shami": "GT", "Sam Curran": "PBKS", 
      "Shikhar Dhawan": "PBKS", "Liam Livingstone": "PBKS", "Arshdeep Singh": "PBKS", 
      "Jitesh Sharma": "PBKS", "Shashank Singh": "PBKS", "Ashutosh Sharma": "PBKS", 
      "Harshal Patel": "PBKS", "Prabhsimran Singh": "PBKS"
    };
    if (mapping[playerName]) return mapping[playerName];
    let hash = 0;
    for (let i = 0; i < playerName.length; i++) hash += playerName.charCodeAt(i);
    const franchises = ["CSK", "MI", "RCB", "KKR", "RR", "SRH", "DC", "LSG", "GT", "PBKS"];
    return franchises[hash % franchises.length];
  };

  const triggerRTMIfEligible = (currentPlayer, finalBidder, finalBid) => {
    if (!finalBidder || finalBid <= 0) return false;
    const prevTeam = getPreviousTeam(currentPlayer.name);
    
    // Check if previous team is an active participant in this auction
    const prevTeamParticipant = participants.find(p => p.team_name === prevTeam);
    const rtmCount = rtmCards[prevTeam] || 0;
    
    if (prevTeamParticipant && prevTeam !== finalBidder && rtmCount > 0) {
      // Check if they have enough budget to match + safety reserve for minimum squad size
      const squad = roomPlayers.filter(p => p.sold_to === prevTeam);
      const minSquadShortfall = Math.max(0, 18 - squad.length - 1);
      const safetyReserve = minSquadShortfall * 0.20;
      const canAfford = prevTeamParticipant.budget >= finalBid + safetyReserve;

      if (canAfford) {
        setRtmState({
          isActive: true,
          playerId: currentPlayer.id || currentPlayer.player_id,
          player: currentPlayer,
          finalBidder: finalBidder,
          finalBid: finalBid,
          previousTeam: prevTeam,
          timeLeft: 12
        });

        // Pause normal timer timeouts
        if (aiBidTimeoutRef.current) clearTimeout(aiBidTimeoutRef.current);

        // Add RTM alert commentary
        setComments(prev => [
          {
            id: Math.random().toString(),
            team: 'SYSTEM',
            text: `🚨 RTM ALERT: ${prevTeam} has the option to match the winning bid of ₹${finalBid} Cr by ${finalBidder} for ${currentPlayer.name}!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'system'
          },
          ...prev
        ]);

        if (gameMode === 'online' && isHost) {
          supabase.from('rooms').update({
            status: 'rtm',
            bid_timer_ends: new Date(new Date().getTime() + 12000).toISOString()
          }).eq('id', roomId).then();
        }

        return true;
      }
    }
    return false;
  };

  const handleRtmDecision = async (matched) => {
    setRtmState(prev => ({ ...prev, isActive: false }));

    const { player, finalBidder, finalBid, previousTeam } = rtmState;
    const winningTeam = matched ? previousTeam : finalBidder;
    const price = finalBid;

    // Trigger gavel animation
    setGavelStrike(true);
    setTimeout(() => setGavelStrike(false), 800);

    // Comment log
    const commentId = Math.random().toString();
    const commentText = matched 
      ? `🚨 RTM EXERCISED! ${previousTeam} matches the bid of ₹${price} Cr to retain ${player.name}! 🎓` 
      : `🔨 RTM DECLINED! ${previousTeam} passes. ${player.name} is sold to ${finalBidder} for ₹${price} Cr.`;

    setComments(prev => [
      {
        id: commentId,
        team: matched ? previousTeam : finalBidder,
        text: commentText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: matched ? 'rtm' : 'system'
      },
      ...prev
    ]);

    if (matched) {
      setRtmCards(prev => ({
        ...prev,
        [previousTeam]: prev[previousTeam] - 1
      }));
    }

    if (gameMode === 'online') {
      // 1. Update player status in DB
      await supabase
        .from('room_players')
        .update({ status: 'sold', sold_price: price, sold_to: winningTeam })
        .eq('room_id', roomId)
        .eq('player_id', player.player_id);

      // 2. Fetch winning team's budget and subtract
      const { data: buyer } = await supabase
        .from('participants')
        .select('budget')
        .eq('room_id', roomId)
        .eq('team_name', winningTeam)
        .single();
        
      if (buyer) {
        const newBudget = Number((buyer.budget - price).toFixed(2));
        await supabase
          .from('participants')
          .update({ budget: newBudget })
          .eq('room_id', roomId)
          .eq('team_name', winningTeam);
      }

      // Play sound and trigger confetti
      triggerSound('sold');
      if (price >= 10.0) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      }

      // Only host handles drawing next player
      if (isHost) {
        const { data: updatedPlayers } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'available');

        const nextPlayer = updatedPlayers?.length > 0 ? updatedPlayers[0] : null;

        setTimeout(async () => {
          isProcessingRef.current = false;
          if (nextPlayer) {
            const nextTimerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).toISOString();
            await supabase
              .from('rooms')
              .update({
                status: 'active',
                current_player_id: nextPlayer.player_id,
                current_bid: 0,
                current_bidder: null,
                bid_timer_ends: nextTimerEnds
              })
              .eq('id', roomId);
          } else {
            await supabase
              .from('rooms')
              .update({ status: 'finished' })
              .eq('id', roomId);
          }
        }, 3000);
      } else {
        // Non-host: update room status to rtm_resolved to signal the host
        await supabase
          .from('rooms')
          .update({ status: 'rtm_resolved' })
          .eq('id', roomId);
      }

    } else {
      // Offline local
      const updatedPlayers = roomPlayers.map(p => {
        if (p.id === player.id) {
          return {
            ...p,
            status: 'sold',
            sold_price: price,
            sold_to: winningTeam
          };
        }
        return p;
      });

      setRoomPlayers(updatedPlayers);
      setOfflinePlayers(updatedPlayers);

      const updatedParts = participants.map(p => {
        if (p.team_name === winningTeam) {
          return { ...p, budget: Number((p.budget - price).toFixed(2)) };
        }
        return p;
      });
      setParticipants(updatedParts);
      setOfflineParticipants(updatedParts);

      triggerSound('sold');
      
      if (price >= 10.0) {
        const duration = 3000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f59e0b', '#d97706', '#fbbf24'] });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f59e0b', '#d97706', '#fbbf24'] });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      } else if (price >= 5.0) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      }

      const nextPlayer = updatedPlayers.find(p => p.status === 'available');

      setTimeout(() => {
        isProcessingRef.current = false;
        if (nextPlayer) {
          const timerEnds = new Date(new Date().getTime() + (timerDuration * 1000)).getTime();
          setRoomState(prev => ({
            ...prev,
            status: 'active',
            current_player_id: nextPlayer.id,
            current_bid: 0,
            current_bidder: null,
            bid_timer_ends: timerEnds
          }));
          setTimeLeft(timerDuration);
          
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
        } else {
          setRoomState(prev => ({ ...prev, status: 'finished' }));
          setView('summary');
        }
      }, 3000);
    }
  };

  // RTM Timer tick and Bot choice logic
  useEffect(() => {
    if (!rtmState.isActive) return;

    const rtmTimer = setInterval(() => {
      setRtmState(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(rtmTimer);
          // RTM Timeout - auto-decline
          handleRtmDecision(false);
          return { ...prev, timeLeft: 0, isActive: false };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    const prevTeamParticipant = participants.find(p => p.team_name === rtmState.previousTeam);
    const isBot = prevTeamParticipant?.isBot || (prevTeamParticipant?.user_id && prevTeamParticipant.user_id.startsWith('bot_'));
    
    if (isBot) {
      const decisionDelay = Math.random() * 2000 + 1500; // 1.5s to 3.5s delay
      const botTimeout = setTimeout(() => {
        const player = rtmState.player;
        const price = rtmState.finalBid;
        const botTeam = rtmState.previousTeam;
        
        // Bot decision logic
        const valuation = getBotValuation(player, botTeam, roomPlayers, participants);
        const squad = roomPlayers.filter(p => p.sold_to === botTeam);
        const minSquadShortfall = Math.max(0, 18 - squad.length - 1);
        const safetyReserve = minSquadShortfall * 0.20;
        
        const strategy = BOT_STRATEGIES[botTeam] || { type: 'BALANCED' };
        let matchThreshold = valuation * 1.1; // Default: match up to 10% premium
        if (strategy.type === 'AGGRESSIVE' && player.rating >= 88) matchThreshold = valuation * 1.25;
        if (botTeam === 'CSK' && player.rating >= 85) matchThreshold = valuation * 1.25;
        
        const canAfford = prevTeamParticipant.budget >= price + safetyReserve;
        const wantsToMatch = price <= matchThreshold;
        
        const shouldMatch = canAfford && wantsToMatch;
        handleRtmDecision(shouldMatch);
      }, decisionDelay);

      return () => {
        clearInterval(rtmTimer);
        clearTimeout(botTimeout);
      };
    }

    return () => clearInterval(rtmTimer);
  }, [rtmState.isActive, rtmState.playerId, participants, roomPlayers]);

  // Sync online RTM state for non-hosts
  useEffect(() => {
    if (gameMode !== 'online' || isHost) return;

    if (roomState.status === 'rtm') {
      const currentPlayer = roomPlayers.find(p => p.player_id === roomState.current_player_id);
      if (currentPlayer) {
        const prevTeam = getPreviousTeam(currentPlayer.name);
        const ends = new Date(roomState.bid_timer_ends).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.ceil((ends - now) / 1000));

        setRtmState({
          isActive: true,
          playerId: currentPlayer.player_id,
          player: currentPlayer,
          finalBidder: roomState.current_bidder,
          finalBid: roomState.current_bid,
          previousTeam: prevTeam,
          timeLeft: diff
        });
      }
    } else {
      setRtmState(prev => prev.isActive ? { ...prev, isActive: false } : prev);
    }
  }, [roomState.status, roomState.current_player_id, roomState.bid_timer_ends, gameMode, isHost, roomPlayers]);

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
      const valuation = getBotValuation(currentPlayer, b.team_name, roomPlayers, participants);
      
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
    const filteredPlayers = initialPlayers.filter(p => selectedSets.includes(p.set_index));
    const shuffled = [];
    for (const s of selectedSets) {
      const setPlayers = filteredPlayers.filter(p => p.set_index === s).sort(() => Math.random() - 0.5);
      shuffled.push(...setPlayers);
    }
    
    const finalPlayers = shuffled.map((p, idx) => ({ ...p, base_price: p.basePrice, status: 'available', sold_price: null, sold_to: null, order_index: idx }));
    
    setRoomPlayers(finalPlayers);
    setOfflinePlayers(finalPlayers);
    setRtmCards({ CSK: 2, MI: 2, RCB: 2, KKR: 2, RR: 2, SRH: 2, DC: 2, LSG: 2, GT: 2, PBKS: 2 });
    setRtmState({ isActive: false, playerId: null, player: null, finalBidder: null, finalBid: 0, previousTeam: null, timeLeft: 12 });

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
        text: bidAmount >= 15 ? `A massive statement! ${bidderTeam} breaks the bank with ${bidAmount} Cr!` : bidAmount === activePlayer.base_price ? `${bidderTeam} opens the bidding war at ${bidAmount} Cr!` : `${bidderTeam} raises the stakes to ${bidAmount} Cr.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'bid',
        player_id: playerId
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

    // Check RTM eligibility first
    if (bidder && price > 0) {
      const didTrigger = triggerRTMIfEligible(curPlayer, bidder, price);
      if (didTrigger) return;
    }

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
      
      if (price >= 10.0) {
        // Massive Celebration for >10Cr
        const duration = 3000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f59e0b', '#d97706', '#fbbf24'] });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f59e0b', '#d97706', '#fbbf24'] });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      } else if (price >= 5.0) {
        // Moderate celebration
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        // Standard sell
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      }
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


  // General Bid Calculator (IPL Tiered Rules)
  const getNextBidAmount = (currentBid, basePrice) => {
    const activePrice = Math.max(currentBid, basePrice);
    if (activePrice < 1.0) return Number((activePrice + 0.05).toFixed(2));
    if (activePrice < 2.0) return Number((activePrice + 0.10).toFixed(2));
    if (activePrice < 3.0) return Number((activePrice + 0.20).toFixed(2));
    if (activePrice < 5.0) return Number((activePrice + 0.25).toFixed(2));
    return Number((activePrice + 0.50).toFixed(2));
  };


  // --- UNIVERSAL TRANSITIONS ---

  // Handle Pre-Auction Retentions
  const handleRetainPlayer = (playerId, teamId, price) => {
    const pIdx = roomPlayers.findIndex(p => p.id === playerId);
    if (pIdx === -1) return;
    
    const updatedPlayers = [...roomPlayers];
    updatedPlayers[pIdx] = {
      ...updatedPlayers[pIdx],
      status: 'retained',
      sold_to: teamId,
      sold_price: price
    };
    
    const updatedParticipants = participants.map(p => {
      if (p.team_name === teamId) {
        return { ...p, budget: Number((p.budget - price).toFixed(2)) };
      }
      return p;
    });

    setRoomPlayers(updatedPlayers);
    setOfflinePlayers(updatedPlayers);
    setParticipants(updatedParticipants);
    setOfflineParticipants(updatedParticipants);
  };

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

  // Move to Season Dashboard
  const handleProceedToSeason = () => {
    setView('season');
  };

  // Move to Trade Market
  const handleProceedToTrade = () => {
    setView('trade');
  };

  // Execute an agreed Trade
  const executeTrade = async (playerAId, playerBId, cashAdjustment = 0) => {
    const updatedPlayers = [...roomPlayers];
    const aIdx = updatedPlayers.findIndex(p => p.id === playerAId);
    const bIdx = updatedPlayers.findIndex(p => p.id === playerBId);
    
    if (aIdx === -1 || bIdx === -1) return;

    // Get the two teams trading
    const teamA = updatedPlayers[aIdx].sold_to;
    const teamB = updatedPlayers[bIdx].sold_to;
    const priceA = updatedPlayers[aIdx].sold_price || 0;
    const priceB = updatedPlayers[bIdx].sold_price || 0;

    // Swap sold_to and sold_price
    updatedPlayers[aIdx].sold_to = teamB;
    updatedPlayers[aIdx].sold_price = priceB;

    updatedPlayers[bIdx].sold_to = teamA;
    updatedPlayers[bIdx].sold_price = priceA;

    setRoomPlayers(updatedPlayers);
    setOfflinePlayers(updatedPlayers);

    // If there is a cash adjustment, update budgets
    let updatedParts = [...participants];
    if (cashAdjustment !== 0) {
      updatedParts = participants.map(p => {
        if (p.team_name === teamA) {
          return { ...p, budget: Number((p.budget - cashAdjustment).toFixed(2)) };
        }
        if (p.team_name === teamB) {
          return { ...p, budget: Number((p.budget + cashAdjustment).toFixed(2)) };
        }
        return p;
      });
      setParticipants(updatedParts);
      setOfflineParticipants(updatedParts);
    }

    // Sync online database if roomId is active
    if (roomId) {
      try {
        // 1. Update players in room_players table
        await supabase
          .from('room_players')
          .update({ sold_to: teamB, sold_price: priceB })
          .eq('room_id', roomId)
          .eq('id', playerAId);

        await supabase
          .from('room_players')
          .update({ sold_to: teamA, sold_price: priceA })
          .eq('room_id', roomId)
          .eq('id', playerBId);

        // 2. Update budgets in participants table
        if (cashAdjustment !== 0) {
          const partA = updatedParts.find(p => p.team_name === teamA);
          const partB = updatedParts.find(p => p.team_name === teamB);

          if (partA) {
            await supabase
              .from('participants')
              .update({ budget: partA.budget })
              .eq('room_id', roomId)
              .eq('team_name', teamA);
          }

          if (partB) {
            await supabase
              .from('participants')
              .update({ budget: partB.budget })
              .eq('room_id', roomId)
              .eq('team_name', teamB);
          }
        }
      } catch (err) {
        console.error("Failed to sync trade to Supabase:", err);
      }
    }
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
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '16px 24px', position: 'sticky', top: '16px', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="font-display ipl-glow-text" style={{ fontWeight: '800', fontSize: '28px', letterSpacing: '0.02em' }}>
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
          <LandingPage
            gameMode={gameMode}
            setGameMode={setGameMode}
            supabaseConnected={supabaseConnected}
            userName={userName}
            setUserName={setUserName}
            selectedSets={selectedSets}
            setSelectedSets={setSelectedSets}
            timerDuration={timerDuration}
            setTimerDuration={setTimerDuration}
            expectedPlayers={expectedPlayers}
            setExpectedPlayers={setExpectedPlayers}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            selectedBotTeams={selectedBotTeams}
            setSelectedBotTeams={setSelectedBotTeams}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            handleJoinRoomOnline={handleJoinRoomOnline}
            handleCreateRoomOnline={handleCreateRoomOnline}
            handleCreateRoomOffline={handleCreateRoomOffline}
          />
        )}

        {/* 2. LOBBY SCREEN */}
        {view === 'lobby' && (
          <LobbyPage
            roomCode={roomCode}
            participants={participants}
            userId={userId}
            roomState={roomState}
            handleLeaveRoom={handleLeaveRoom}
            isHost={isHost}
            gameMode={gameMode}
            handleStartAuctionOnline={handleStartAuctionOnline}
            handleStartAuctionOffline={handleStartAuctionOffline}
            expectedPlayers={expectedPlayers}
            roomPlayers={roomPlayers}
            handleRetainPlayer={handleRetainPlayer}
          />
        )}

        {/* 3. AUCTION ROOM SCREEN */}
        {(view === 'auction' || (view === 'lobby' && roomState.status === 'active')) && (
          <AuctionRoom
            roomState={roomState}
            roomPlayers={roomPlayers}
            participants={participants}
            selectedTeam={selectedTeam}
            timeLeft={timeLeft}
            timerDuration={timerDuration}
            gavelStrike={gavelStrike}
            gameMode={gameMode}
            isHost={isHost}
            offlinePlayers={offlinePlayers}
            comments={comments}
            commentInput={commentInput}
            setCommentInput={setCommentInput}
            showRosterTeam={showRosterTeam}
            setShowRosterTeam={setShowRosterTeam}
            getNextBidAmount={getNextBidAmount}
            getTeamSquadCount={getTeamSquadCount}
            getOverseasCount={getOverseasCount}
            handlePlaceBidOnline={handlePlaceBidOnline}
            handlePlaceBidOffline={handlePlaceBidOffline}
            handleHostControlOnline={handleHostControlOnline}
            handleHostControlOffline={handleHostControlOffline}
            handleSendComment={handleSendComment}
            rtmState={rtmState}
            rtmCards={rtmCards}
            handleRtmDecision={handleRtmDecision}
            getPreviousTeam={getPreviousTeam}
          />
        )}
        {/* 4. SUMMARY / LEADERBOARD END SCREEN */}
        {view === 'summary' && (
          <SummaryPage
            participants={participants}
            roomPlayers={roomPlayers}
            selectedTeam={selectedTeam}
            handleLeaveRoom={handleLeaveRoom}
            calculateSquadRating={calculateSquadRating}
            getTeamSquadCount={getTeamSquadCount}
            getOverseasCount={getOverseasCount}
            handleProceedToSeason={handleProceedToSeason}
            handleProceedToTrade={handleProceedToTrade}
          />
        )}
        
        {/* 5. TRADE MARKET (Phase 5) */}
        {view === 'trade' && (
          <TradeMarket 
            participants={participants}
            roomPlayers={roomPlayers}
            userId={userId}
            handleLeaveRoom={handleLeaveRoom}
            handleProceedToSeason={handleProceedToSeason}
            executeTrade={executeTrade}
          />
        )}
        
        {/* 6. SEASON DASHBOARD (Phase 3) */}
        {view === 'season' && (
          <SeasonDashboard 
            participants={participants}
            allPlayers={roomPlayers}
            userId={userId}
            handleLeaveRoom={handleLeaveRoom}
            handleProceedToTrade={handleProceedToTrade}
          />
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
