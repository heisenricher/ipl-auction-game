-- IPL Mega Auction Supabase Setup Script
-- Paste this script in the Supabase SQL Editor and run it.

-- Enable Row Level Security (RLS) and Realtime

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS bids_log;
DROP TABLE IF EXISTS room_players;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS rooms;

-- 1. Create Rooms Table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'lobby', -- 'lobby', 'active', 'paused', 'finished'
  current_player_id INT, -- References player_id in room_players
  current_bid NUMERIC(5,2) DEFAULT 0.00,
  current_bidder VARCHAR(10), -- selected team name (e.g. 'CSK', 'MI')
  bid_timer_ends TIMESTAMPTZ,
  host_id VARCHAR(100) NOT NULL, -- UUID or simple string identifier of the room creator
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Participants Table (IPL Franchises)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL, -- Client unique ID
  user_name VARCHAR(100) NOT NULL,
  team_name VARCHAR(10), -- 'CSK', 'MI', 'RCB', 'KKR', 'RR', 'SRH', 'DC', 'LSG', 'GT', 'PBKS'
  budget NUMERIC(5,2) DEFAULT 120.00, -- 120 Crore budget
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_room_team UNIQUE(room_id, team_name),
  CONSTRAINT unique_room_user UNIQUE(room_id, user_id)
);

-- 3. Create Room Players Table (State of players for each specific room)
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'
  country VARCHAR(50) NOT NULL,
  rating INT NOT NULL,
  base_price NUMERIC(5,2) NOT NULL,
  stats JSONB,
  description TEXT,
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'sold', 'unsold'
  sold_price NUMERIC(5,2),
  sold_to VARCHAR(10), -- team_name
  order_index INT NOT NULL,
  CONSTRAINT unique_room_player UNIQUE(room_id, player_id)
);

-- 4. Create Bids Log Table (Historical logs of bids)
CREATE TABLE bids_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id INT NOT NULL,
  team_name VARCHAR(10) NOT NULL,
  bid_amount NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add indexes for performance
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_participants_room ON participants(room_id);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_bids_log_room ON bids_log(room_id);

-- 6. Enable Realtime Replication
-- This enables Supabase to broadcast database changes to clients subscribed via websockets.
begin;
  -- remove the tables if they are already in the publication
  alter publication supabase_realtime delete table rooms, participants, room_players, bids_log;
exception when others then
  -- publication might not exist or tables not in it, ignore
end;

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table bids_log;

-- 7. Bypass RLS for simplicity in sandbox/game environment.
-- In a production enterprise app we would configure Row Level Security (RLS) rules.
-- For a multiplayer hobby game, we disable RLS to allow direct CRUD operations from the clients.
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids_log DISABLE ROW LEVEL SECURITY;
