import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Database, Trash2, Bell, Eye, Zap, Sparkles, Image as ImageIcon, Download, Wifi } from 'lucide-react';
import { useAeirmist } from '../../context/AeirmistContext';
import { MediaQuality } from '../../services/MediaService';
import { getAvatarUrl } from '../../lib/avatar';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { clearCache, profile, mediaSettings, setMediaSettings } = useAeirmist();
  const [clearing, setClearing] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleClearCache = async () => {
    setClearing(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate scrub
    await clearCache();
    setClearing(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  const updateQuality = (quality: MediaQuality) => {
    setMediaSettings({ ...mediaSettings, quality });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-aeirmist-bg/80 backdrop-blur-2xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold">This Device</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Identity Configuration</p>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <section>
                  <label className="text-[9px] font-black text-aeirmist-cyan uppercase tracking-[0.3em] mb-4 block">Media Transmission</label>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3 mb-4">
                        <ImageIcon size={14} className="text-aeirmist-cyan" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Connections Quality</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(MediaQuality).map((q) => (
                          <button
                            key={q}
                            onClick={() => updateQuality(q)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              mediaSettings.quality === q 
                                ? 'bg-aeirmist-cyan/20 border-aeirmist-cyan/40 text-aeirmist-cyan shadow-[0_0_10px_rgba(0,242,255,0.2)]' 
                                : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                            }`}
                          >
                            {q.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-aeirmist-cyan/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-aeirmist-cyan/10 flex items-center justify-center text-aeirmist-cyan">
                          <Download size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Auto-Download</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-widest">Sync media on WiFi</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setMediaSettings({ ...mediaSettings, autoDownload: !mediaSettings.autoDownload })}
                        className={`w-12 h-6 rounded-full transition-all relative ${mediaSettings.autoDownload ? 'bg-aeirmist-cyan' : 'bg-white/10'}`}
                      >
                        <motion.div 
                          animate={{ x: mediaSettings.autoDownload ? 26 : 4 }}
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[9px] font-black text-aeirmist-magenta uppercase tracking-[0.3em] mb-4 block">Data Vault</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-aeirmist-magenta/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-aeirmist-magenta/10 flex items-center justify-center text-aeirmist-magenta">
                          <Database size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Identity Cache</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-widest">Messages & Media storage</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleClearCache}
                        disabled={clearing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          done ? 'bg-aeirmist-lime text-aeirmist-bg' : 'bg-aeirmist-magenta/10 text-aeirmist-magenta hover:bg-aeirmist-magenta hover:text-white'
                        }`}
                      >
                        {clearing ? (
                          <Zap size={14} className="animate-spin" />
                        ) : done ? (
                          <>SCRUBBED</>
                        ) : (
                          <>SCRUB VAULT</>
                        )}
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 block">Digital Overlay</label>
                  <div className="grid grid-cols-2 gap-2">
                    <SettingsToggle icon={<Bell size={14} />} label="Push Notifications" active={true} />
                    <SettingsToggle icon={<Eye size={14} />} label="Stealth Mode" active={false} />
                    <SettingsToggle icon={<Shield size={14} />} label="Sync Guard" active={true} />
                    <SettingsToggle icon={<Sparkles size={14} />} label="AI Assist" active={true} />
                  </div>
                </section>
              </div>

              <div className="mt-12 p-4 bg-aeirmist-cyan/5 border border-aeirmist-cyan/10 rounded-2xl flex items-center gap-4">
                <img src={getAvatarUrl(profile?.photoURL)} alt="" className="w-12 h-12 rounded-full border-2 border-aeirmist-cyan" />
                <div>
                  <p className="text-xs font-bold">{profile?.displayName}</p>
                  <p className="text-[10px] text-aeirmist-cyan font-black uppercase tracking-widest italic">Identity sync active</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SettingsToggle = ({ icon, label, active }: { icon: React.ReactNode, label: string, active: boolean }) => (
  <button className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${active ? 'bg-white/5 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/40'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);
