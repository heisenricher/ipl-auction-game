import React, { useState } from 'react';
import { X, Save, Search, ShieldCheck } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { FRANCHISES } from '../utils/constants';

const RetentionModal = ({ isOpen, onClose, roomPlayers, participants, onRetain }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [retentionPrice, setRetentionPrice] = useState('');

  if (!isOpen) return null;

  // Filter available players that match search
  const availablePlayers = roomPlayers.filter(p => 
    p.status === 'available' && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const handleRetain = () => {
    if (!selectedPlayer || !selectedTeam || !retentionPrice) {
      alert("Please select a player, a team, and a valid retention price.");
      return;
    }
    const price = parseFloat(retentionPrice);
    if (isNaN(price) || price < 0.1) {
      alert("Please enter a valid price (e.g. 15.0).");
      return;
    }
    
    // Call the parent handler
    onRetain(selectedPlayer.id, selectedTeam, price);
    
    // Reset form
    setSelectedPlayer(null);
    setSearchTerm('');
    setRetentionPrice('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeInUp flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900">Setup Pre-Auction Retentions</h2>
              <p className="text-xs text-slate-500">Assign players to franchises before the auction begins.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scroll flex flex-col gap-6">
          
          {/* Step 1: Search Player */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">1. Select Player</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
            
            {/* Search Results */}
            {searchTerm && !selectedPlayer && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-40 overflow-y-auto custom-scroll">
                {availablePlayers.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedPlayer(p)}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.role} • {p.country}</div>
                    </div>
                    <div className="text-xs font-bold text-amber-600">
                      Base: ₹{p.base_price}Cr
                    </div>
                  </div>
                ))}
                {availablePlayers.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center">No available players found.</div>
                )}
              </div>
            )}
            
            {/* Selected Player Card */}
            {selectedPlayer && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold font-display">
                    {selectedPlayer.rating}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{selectedPlayer.name}</div>
                    <div className="text-xs text-amber-700">{selectedPlayer.role} • {selectedPlayer.country}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPlayer(null)}
                  className="text-xs text-amber-600 hover:text-amber-800 underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 2 & 3: Team and Price */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">2. Retaining Franchise</label>
              <select 
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-display font-semibold"
              >
                <option value="">-- Select Franchise --</option>
                {participants.map(p => {
                  const fInfo = FRANCHISES.find(f => f.id === p.team_name);
                  return (
                    <option key={p.id} value={p.team_name}>
                      {p.team_name} (Budget: ₹{p.budget}Cr)
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">3. Retention Price (Cr)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-slate-500">₹</span>
                <input 
                  type="number" 
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 15.0"
                  value={retentionPrice}
                  onChange={(e) => setRetentionPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-display font-bold"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
          <button 
            onClick={handleRetain}
            disabled={!selectedPlayer || !selectedTeam || !retentionPrice}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} /> Confirm Retention
          </button>
        </div>

      </div>
    </div>
  );
};

export default RetentionModal;
