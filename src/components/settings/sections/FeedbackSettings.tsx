import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Bug, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown,
  AlertCircle,
  Check,
  Zap,
  Layers,
  Heart
} from 'lucide-react';
import { useAeirmist } from '../../../context/AeirmistContext';

const FeedbackSettings = () => {
  const { addToast } = useAeirmist();
  const [type, setType] = useState<'bug' | 'feature' | 'general' | 'appreciation'>('general');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    await new Promise(r => setTimeout(r, 1200));
    
    setIsSending(false);
    setSent(true);
    addToast?.({
      title: 'Feedback Received',
      message: 'Thank you! Your feedback has been successfully sent to our product team.',
      type: 'success'
    });
    
    setTimeout(() => {
      setSent(false);
      setMessage('');
    }, 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="space-y-1">
        <h2 className="text-3xl font-display font-bold text-white">Send Feedback</h2>
        <p className="text-xs text-white/45 uppercase tracking-widest font-medium">Help us improve the Aeirmist experience for everyone</p>
      </div>

      {/* Hero Feedback Card */}
      <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-aeirmist-cyan">
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase tracking-wider text-white">Share Your Thoughts</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">Support & Feature Requests</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FeedbackTypeBtn 
              active={type === 'bug'} 
              onClick={() => setType('bug')} 
              icon={<Bug size={14} />} 
              label="Bug Report" 
              color="text-red-400"
            />
            <FeedbackTypeBtn 
              active={type === 'feature'} 
              onClick={() => setType('feature')} 
              icon={<Sparkles size={14} />} 
              label="Feature Idea" 
              color="text-aeirmist-cyan"
            />
            <FeedbackTypeBtn 
              active={type === 'general'} 
              onClick={() => setType('general')} 
              icon={<Layers size={14} />} 
              label="General" 
              color="text-white"
            />
            <FeedbackTypeBtn 
              active={type === 'appreciation'} 
              onClick={() => setType('appreciation')} 
              icon={<Heart size={14} />} 
              label="Compliment" 
              color="text-aeirmist-magenta"
            />
          </div>

          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you love or how we can improve..."
              className="w-full h-40 p-6 bg-white/[0.03] border border-white/10 rounded-3xl text-sm font-sans text-white placeholder:text-white/20 focus:border-white/30 focus:bg-white/[0.05] outline-none transition-all resize-none"
              required
            />
            <div className="absolute bottom-4 right-4 text-[9px] font-mono text-white/30 uppercase">
              {message.length} chars
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending || sent || !message.trim()}
            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-[0.3em] transition-all cursor-pointer ${
              sent 
                ? 'bg-aeirmist-lime text-black' 
                : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20'
            }`}
          >
            {isSending ? (
              <>
                <Zap size={16} className="animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <Check size={16} />
                Submitted
              </>
            ) : (
              <>
                <Send size={16} />
                Send Feedback
              </>
            )}
          </button>
        </form>
      </div>

      {/* Ratings & Quick Poll */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/60">Experience Rating</h4>
          <div className="flex items-center gap-6">
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-aeirmist-cyan/10 group-hover:text-aeirmist-cyan transition-all">
                <ThumbsUp size={24} />
              </div>
              <span className="text-[9px] font-black uppercase text-white/20 group-hover:text-white/40">Optimal</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-aeirmist-magenta/10 group-hover:text-aeirmist-magenta transition-all">
                <ThumbsDown size={24} />
              </div>
              <span className="text-[9px] font-black uppercase text-white/20 group-hover:text-white/40">Suboptimal</span>
            </button>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-aeirmist-cyan" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Join the Beta</h4>
          </div>
          <p className="text-[10px] text-white/30 leading-relaxed">
            Want to test experimental neural features before the general nodes? Enroll in the Aeirmist Vanguard program.
          </p>
          <button className="px-6 py-2.5 rounded-xl bg-aeirmist-cyan/10 border border-aeirmist-cyan/30 text-aeirmist-cyan text-[10px] font-black uppercase tracking-widest hover:bg-aeirmist-cyan hover:text-black transition-all">
            Enroll Now
          </button>
        </div>
      </section>
    </motion.div>
  );
};

const FeedbackTypeBtn = ({ active, onClick, icon, label, color }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
      active 
        ? 'bg-white/10 border-white/20 shadow-xl' 
        : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/10'
    }`}
  >
    <span className={active ? color : ''}>{icon}</span>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-white' : ''}`}>{label}</span>
  </button>
);

export default FeedbackSettings;
