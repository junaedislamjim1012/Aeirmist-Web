import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Languages, 
  MessageSquare, 
  Type, 
  Settings2, 
  Scan, 
  ArrowRight,
  Check
} from 'lucide-react';
import { useAeirmist } from '../../../context/AeirmistContext';

const LanguagesSettings = () => {
  const currentLang = 'English (US)';

  const availableLanguages = [
    { name: 'English', dialect: 'United States', code: 'en-US', status: 'Active' },
    { name: 'Español', dialect: 'Castellano', code: 'es-ES', status: 'Available' },
    { name: 'Français', dialect: 'Moderne', code: 'fr-FR', status: 'Available' },
    { name: 'Deutsch', dialect: 'Standard', code: 'de-DE', status: 'Available' },
    { name: '日本語', dialect: 'Japan', code: 'ja-JP', status: 'Available' },
    { name: '한국어', dialect: 'Seoul', code: 'ko-KR', status: 'Available' },
    { name: 'Português', dialect: 'Brasil', code: 'pt-BR', status: 'Available' },
    { name: 'Mandarin', dialect: 'Simplified', code: 'zh-CN', status: 'Available' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="space-y-1">
        <h2 className="text-3xl font-display font-bold text-white">Languages</h2>
        <p className="text-xs text-white/45 uppercase tracking-widest font-medium">Choose your preferred display language and translation options</p>
      </div>

      {/* Current Language Hero */}
      <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/10 flex items-center justify-between group">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-aeirmist-cyan border border-white/10 group-hover:scale-105 transition-transform">
            <Globe size={32} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Active Language</h3>
            <div className="text-2xl font-display font-bold text-white">{currentLang}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-aeirmist-cyan/10 border border-aeirmist-cyan/20">
          <div className="w-1.5 h-1.5 rounded-full bg-aeirmist-cyan animate-pulse" />
          <span className="text-[10px] font-black text-aeirmist-cyan uppercase tracking-widest">Default</span>
        </div>
      </div>

      {/* Language Grid */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
            <Languages size={18} />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">Available Languages</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              className={`p-5 rounded-2xl border transition-all text-left flex items-center justify-between group cursor-pointer ${
                lang.name === 'English'
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-colors ${
                  lang.name === 'English' ? 'text-aeirmist-cyan' : 'text-white/20 group-hover:text-white/40'
                }`}>
                  <Type size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white">{lang.name}</div>
                  <div className="text-[9px] text-white/30 uppercase font-mono mt-0.5">{lang.dialect}</div>
                </div>
              </div>
              {lang.name === 'English' ? (
                <Check size={16} className="text-aeirmist-cyan" />
              ) : (
                <ArrowRight size={14} className="text-white/20 group-hover:text-white/60 transition-all group-hover:translate-x-1" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Translation Settings */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-aeirmist-magenta/10 flex items-center justify-center text-aeirmist-magenta">
            <Scan size={18} />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">Translation Preferences</h3>
        </div>

        <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Auto-Translate Messages</h4>
                <p className="text-[10px] text-white/30">Automatically translate incoming messages to your preferred language</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-aeirmist-magenta/20 rounded-full relative transition-all border border-aeirmist-magenta/30 cursor-pointer">
              <div className="absolute top-1 right-1 w-4 h-4 bg-aeirmist-magenta rounded-full" />
            </button>
          </div>

          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60">
                   <Settings2 size={20} />
                 </div>
                 <div>
                   <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Smart Formatting</h4>
                   <p className="text-[10px] text-white/30">Automatically format regional currency, dates, and numbers</p>
                 </div>
               </div>
               <button className="w-12 h-6 bg-white/10 rounded-full relative transition-all border border-white/10 cursor-pointer">
                 <div className="absolute top-1 left-1 w-4 h-4 bg-white/20 rounded-full" />
               </button>
             </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default LanguagesSettings;
