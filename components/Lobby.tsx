
import React, { useState } from 'react';

interface LobbyProps {
  onJoin: (nickname: string, code: string) => void;
  onCreate: (nickname: string) => void;
  error: string | null;
}

const Lobby: React.FC<LobbyProps> = ({ onJoin, onCreate, error }) => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  const handleAdminAuth = () => {
    if (adminPin === '2985') {
      onCreate(nickname || 'Animateur DZ');
    } else {
      alert("Code PIN Incorrect (Besoin du PIN animateur)");
    }
  };

  return (
    <div className="min-h-screen bg-dz-gradient flex flex-col items-center justify-center p-4">
      <div className="bg-slate-950/90 backdrop-blur-xl p-10 rounded-[2.5rem] border-4 border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.3)] w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block bg-yellow-500 text-slate-950 font-black px-4 py-1 rounded-lg text-xs tracking-tighter mb-2">TV SHOW DZ</div>
          <h1 className="text-7xl font-game gold-glow text-yellow-500 mb-0">FAMILLE DZ</h1>
          <h2 className="text-5xl font-game text-white tracking-widest uppercase">En Or</h2>
        </div>

        <div className="space-y-8">
          {!showAdminLogin ? (
            <>
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Votre Pseudo</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-yellow-500 transition-all text-xl font-bold"
                    placeholder="ex: Tahia_DZ"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Code du Salon</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all text-xl font-bold uppercase"
                    placeholder="DZ-XXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => onJoin(nickname, roomCode.toUpperCase())}
                  disabled={!nickname || !roomCode}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-30 text-white font-game text-3xl py-5 rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  REJOINDRE LE LIVE
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="w-full text-slate-500 hover:text-yellow-500 font-bold text-xs py-2 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-lock"></i> MODE ANIMATEUR (PIN REQUIS)
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95">
               <button onClick={() => setShowAdminLogin(false)} className="text-slate-500 hover:text-white text-xs font-bold mb-4">
                  <i className="fas fa-chevron-left mr-2"></i> RETOUR
               </button>
               <h3 className="text-2xl font-game text-yellow-500 text-center">AUTHENTIFICATION HÔTE</h3>
               <input
                  type="password"
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-yellow-500 transition-all text-4xl text-center tracking-[0.5em] font-black"
                  placeholder="0000"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                <button
                  onClick={handleAdminAuth}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-game text-3xl py-5 rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  DÉMARRER LE LIVE
                </button>
            </div>
          )}

          {error && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl text-red-500 text-center text-xs font-bold">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
