import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  Sliders, 
  Sparkles, 
  Upload, 
  Save, 
  X, 
  Check, 
  Loader2, 
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import { useAeirmist } from '../../context/AeirmistContext';
import { ChatWallpaperConfig } from './ChatWallpaperLayer';
import { MediaQuality } from '../../services/MediaService';

interface ChatWallpaperControllerProps {
  chatId: string;
  chatThemeSettings?: ChatWallpaperConfig;
  onClose: () => void;
}

const PRESET_WALLPAPERS = [
  { id: 'preset-neural', name: 'Dark Fusion', value: 'linear-gradient(135deg, rgba(8, 7, 12, 1) 0%, rgba(20, 10, 32, 1) 50%, rgba(8, 14, 20, 1) 100%)', isGradient: true },
  { id: 'preset-hologram', name: 'Hologram', value: 'linear-gradient(45deg, #121016 0%, #2a0845 50%, #6441a5 100%)', isGradient: true },
  { id: 'preset-acid', name: 'Acid Liquid', value: 'linear-gradient(135deg, #00f2ff 0%, #ff00ea 100%)', isGradient: true },
  { id: 'preset-emerald', name: 'Bioemerald', value: 'linear-gradient(180deg, #020f0b 0%, #051a14 50%, #00ffaa 100%)', isGradient: true },
  { id: 'preset-carbon', name: 'Carbon Grid', value: 'radial-gradient(circle at center, #111115 0%, #050508 100%)', isGradient: true },
  { id: 'preset-outfit', name: 'Night Skyline', value: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=600&auto=format&fit=crop', isGradient: false },
  { id: 'preset-grid', name: 'Grid Street', value: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop', isGradient: false },
  { id: 'preset-abstract', name: 'Abstract Wave', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', isGradient: false },
];

const PRESET_EFFECTS = [
  { id: 'none', name: 'None', desc: 'Standard clean background' },
  { id: 'cyber-grid', name: 'Grid Overlay', desc: 'Animated 3D grid mesh' },
  { id: 'liquid-neon', name: 'Glowing Liquid', desc: 'Floating colored lights' },
  { id: 'matrix-rain', name: 'Digital Rain', desc: 'Falling code characters' },
  { id: 'neon-glow', name: 'Neon Border', desc: 'Glowing edge outline' },
];

export const ChatWallpaperController: React.FC<ChatWallpaperControllerProps> = ({
  chatId,
  chatThemeSettings,
  onClose
}) => {
  const { uploadMedia, updateConversationThemeSettings, updateProfile, profile, addToast } = useAeirmist();
  
  const globalWallpaper = profile?.themeSettings?.chatWallpaper || {};

  // Form states initialized with existing per-chat configurations, or fallback to global configurations
  const [currentWallpaper, setCurrentWallpaper] = useState(chatThemeSettings?.wallpaperURL || globalWallpaper.wallpaperURL || PRESET_WALLPAPERS[0].value);
  const [blurLevel, setBlurLevel] = useState(chatThemeSettings?.blurLevel !== undefined ? chatThemeSettings.blurLevel : (globalWallpaper.blurLevel !== undefined ? globalWallpaper.blurLevel : 0));
  const [brightness, setBrightness] = useState(chatThemeSettings?.brightness !== undefined ? chatThemeSettings.brightness : (globalWallpaper.brightness !== undefined ? globalWallpaper.brightness : 0.65));
  const [effectType, setEffectType] = useState(chatThemeSettings?.effectType || globalWallpaper.effectType || 'none');
  const [cropPosition, setCropPosition] = useState(chatThemeSettings?.cropPosition || globalWallpaper.cropPosition || { x: 50, y: 50, zoom: 1 });
  const [parallaxEnabled, setParallaxEnabled] = useState(chatThemeSettings?.parallaxEnabled ?? globalWallpaper.parallaxEnabled ?? false);
  const [saveScope, setSaveScope] = useState<'chat' | 'global'>('chat'); // 'chat' = individual chat, 'global' = all chats
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed configuration for instant live preview
  const previewConfig: ChatWallpaperConfig = useMemo(() => ({
    wallpaperURL: currentWallpaper,
    blurLevel,
    brightness,
    effectType,
    overlayColor: '#000000',
    neonIntensity: 0.8,
    cropPosition,
    parallaxEnabled
  }), [currentWallpaper, blurLevel, brightness, effectType, cropPosition, parallaxEnabled]);

  // Handle personal background upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Quick security validation: file size < 15MB and image type
    if (!file.type.startsWith('image/')) {
      addToast({ title: 'Invalid format', message: 'File must be a valid image format.', type: 'warning' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      addToast({ title: 'File too large', message: 'Background volume exceeds 15MB threshold.', type: 'warning' });
      return;
    }

    // Instant local preview update (0ms latency!)
    const localBlobUrl = URL.createObjectURL(file);
    setCurrentWallpaper(localBlobUrl);

    setIsUploading(true);
    try {
      const downloadURL = await uploadMedia(file, 'wallpapers', (progress) => {
        console.log(`Uploading wallpaper: ${Math.round(progress)}%`);
      }, MediaQuality.WALLPAPER_LITE);
      if (downloadURL) {
        setCurrentWallpaper(downloadURL);
      }
    } catch (err) {
      console.warn('Wallpaper cloud upload warning, keeping local preview', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Perform save operation based on user chosen score
  const handleSaveSettings = async () => {
    setIsSaving(true);
    const resolvedConfig = {
      wallpaperURL: currentWallpaper,
      blurLevel,
      brightness,
      effectType,
      bubbleStyle: 'glass',
      overlayColor: '#000000',
      neonIntensity: 0.8,
      cropPosition,
      parallaxEnabled
    };

    try {
      if (saveScope === 'chat') {
        // Apply specifically to the current conversation document
        await updateConversationThemeSettings(chatId, resolvedConfig);
      } else {
        // Apply globally: Save inside profile themeSettings nested parameters
        const currentThemeSettings = profile?.themeSettings || {};
        await updateProfile({
          ...profile,
          themeSettings: {
            ...currentThemeSettings,
            chatWallpaper: resolvedConfig
          }
        });
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed saving wallpaper parameters', err);
      addToast({ title: 'Save failed', message: 'Write request rejected. Check connection or quota restriction.', type: 'warning' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Semi-transparent blur background */}
      <div className="absolute inset-0 bg-aeirmist-bg/85 backdrop-blur-md" onClick={onClose} />

      {/* Main interactive panel */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-4xl bg-aeirmist-bg border border-white/10 rounded-[28px] overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.15)] flex flex-col md:grid md:grid-cols-2 h-[90vh] md:h-[600px]"
      >
        
        {/* Left Side: Real-time Live Preview Panel */}
        <div 
          className="relative border-b md:border-b-0 md:border-r border-white/10 bg-black/40 flex flex-col justify-between p-4 md:p-6 overflow-hidden min-h-[200px] md:min-h-[300px] flex-shrink-0 cursor-move"
          onPointerDown={(e) => {
            if (currentWallpaper.startsWith('linear-gradient') || currentWallpaper.startsWith('radial-gradient')) return;
            const startX = e.clientX;
            const startY = e.clientY;
            const startCropX = cropPosition.x;
            const startCropY = cropPosition.y;
            
            const handlePointerMove = (moveEvent: PointerEvent) => {
              const deltaX = ((moveEvent.clientX - startX) / 200) * 100;
              const deltaY = ((moveEvent.clientY - startY) / 200) * 100;
              setCropPosition(prev => ({
                ...prev,
                x: Math.max(0, Math.min(100, startCropX - deltaX)),
                y: Math.max(0, Math.min(100, startCropY - deltaY))
              }));
            };
            
            const handlePointerUp = () => {
              window.removeEventListener('pointermove', handlePointerMove);
              window.removeEventListener('pointerup', handlePointerUp);
            };
            
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
          }}
        >
          {/* Wallpaper Layer bound directly inside boundaries of preview panel for instant visual alignment */}
          <div className="absolute inset-0 md:rounded-l-[28px] overflow-hidden pointer-events-none">
            {/* Background color */}
            <div className="absolute inset-0 bg-aeirmist-bg" />
            
            {/* Live custom background */}
            <div 
              className="absolute inset-0 transition-all duration-300"
              style={{
                filter: `blur(${blurLevel}px)`,
                opacity: brightness,
                background: currentWallpaper.startsWith('linear-gradient') || currentWallpaper.startsWith('radial-gradient') 
                  ? currentWallpaper 
                  : `url(${currentWallpaper}) no-repeat`,
                backgroundPosition: `${cropPosition.x}% ${cropPosition.y}%`,
                backgroundSize: `${cropPosition.zoom * 100}%`,
              }}
            />

            {/* Custom Overlay tint */}
            <div 
              className="absolute inset-0 bg-black/40" 
              style={{ opacity: Math.max(0, 1 - brightness) }}
            />

            {/* Dynamic visual effect previews in miniature */}
            {effectType === 'cyber-grid' && (
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 242, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 242, 255, 0.15) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  transform: 'perspective(200px) rotateX(60deg) translateY(-20%)',
                  transformOrigin: 'top center',
                  height: '150%',
                }}
              />
            )}
            {effectType === 'liquid-neon' && (
              <div className="absolute inset-0 opacity-25">
                <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-aeirmist-cyan/30 blur-[40px]" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-aeirmist-magenta/35 blur-[40px]" />
              </div>
            )}
            {effectType === 'matrix-rain' && (
              <div className="absolute inset-0 bg-black/10 opacity-20">
                <div className="absolute top-0 inset-x-0 h-full flex justify-between text-aeirmist-lime font-mono text-[5px] select-none scale-y-75 leading-none">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
                      {Array.from({ length: 15 }).map(() => String.fromCharCode(33 + Math.floor(Math.random() * 95))).join('')}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {effectType === 'neon-glow' && (
              <div 
                className="absolute inset-0 border border-aeirmist-cyan/30 rounded-[14px]"
                style={{ boxShadow: 'inset 0 0 20px rgba(0, 242, 255, 0.3)' }}
              />
            )}
          </div>

          {/* Simulated Chat Interface Floating Items */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
              <Eye size={12} className="text-aeirmist-cyan" />
              Preview
            </span>
            <button onClick={onClose} className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/5 transition-all text-white/50 hover:text-white md:hidden">
              <X size={14} />
            </button>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-end space-y-4 py-4 md:py-8">
            {/* Incoming Bubble */}
            <div className="flex gap-2.5 max-w-[80%] items-end">
              <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/10 flex-shrink-0" />
              <div className="rounded-2xl p-3 bg-white/5 border border-white/10 text-[10px] text-white/80 leading-relaxed backdrop-blur-xl">
                How does this background look?
              </div>
            </div>

            {/* Outgoing Bubble */}
            <div className="flex gap-2.5 max-w-[80%] items-end self-end flex-row-reverse">
              <div className="w-6 h-6 rounded-lg bg-aeirmist-cyan/20 border border-aeirmist-cyan/20 flex-shrink-0" />
              <div className="rounded-2xl p-3 bg-gradient-to-br from-aeirmist-cyan/20 to-aeirmist-magenta/20 border border-white/10 text-[10px] text-white backdrop-blur-xl text-right">
                Looks perfect! Extreme clarity maintained automatically.
              </div>
            </div>

            <div className="text-[8px] font-mono text-white/30 text-center uppercase tracking-widest mt-4">
              * Bubbles adapt to brightness automatically
            </div>
          </div>

          <div className="relative z-10 hidden md:flex items-center p-3 bg-black/40 border border-white/5 rounded-2xl gap-3 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-aeirmist-cyan animate-ping" />
            <span className="text-[9px] font-mono text-aeirmist-cyan">LIVE PREVIEW</span>
          </div>
        </div>

        {/* Right Side: Options and Configurations controls */}
        <div className="flex-1 flex flex-col justify-between p-4 md:p-8 overflow-y-auto w-full no-scrollbar">
          <div className="space-y-6">
            
            {/* Title Block Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <Palette className="text-aeirmist-cyan" size={18} />
                  Chat appearance
                </h2>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Customize chat wallpaper</div>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all text-white/40 hover:text-white hidden md:block">
                <X size={16} />
              </button>
            </div>

            {/* preset wallpapers grid selector */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Palette size={12} className="text-aeirmist-cyan" />
                Choose a Wallpaper
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_WALLPAPERS.map((wp) => {
                  const isCurrent = wp.value === currentWallpaper;
                  return (
                    <button
                      key={wp.id}
                      onClick={() => setCurrentWallpaper(wp.value)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden border transition-all ${
                        isCurrent ? 'border-aeirmist-cyan scale-95 shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'border-white/10 hover:border-white/20 hover:scale-[1.03]'
                      }`}
                      style={{
                        background: wp.isGradient ? wp.value : `url(${wp.value}) center / cover no-repeat`
                      }}
                    >
                      {isCurrent && (
                        <div className="absolute inset-0 bg-aeirmist-cyan/20 flex items-center justify-center">
                          <Check size={14} className="text-aeirmist-cyan drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]" />
                        </div>
                      )}
                      
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 py-1 text-[7px] font-bold text-center text-white/70 truncate px-0.5">
                        {wp.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom file background uploader with drag and drag input support */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Upload size={12} className="text-aeirmist-cyan" />
                Upload Custom Picture
              </span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-16 rounded-xl border border-dashed border-white/10 hover:border-aeirmist-cyan/30 bg-white/[0.02] flex items-center justify-center gap-3 transition-all cursor-pointer group active:scale-98"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin text-aeirmist-cyan" size={18} />
                    <span className="text-xs font-mono text-aeirmist-cyan uppercase tracking-widest">UPLOADING IMAGE...</span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-aeirmist-cyan/10 transition-colors">
                      <Upload size={14} className="text-white/60 group-hover:text-aeirmist-cyan transition-colors" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-white/80 uppercase font-black tracking-widest">Upload custom image</div>
                      <div className="text-[8px] text-white/30 uppercase mt-0.5 font-bold">JPG, PNG, WEBP. Under 5MB limit.</div>
                    </div>
                  </>
                )}
              </button>
            </div>

            {/* range controls for blur & intensity (dim level) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blur Level Slider */}
              <div className="space-y-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                  <span className="text-white/40 flex items-center gap-1">
                     <Sliders size={12} className="text-white/40" />
                     Blur Amount
                  </span>
                  <span className="text-aeirmist-cyan font-mono">{blurLevel}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  value={blurLevel} 
                  onChange={(e) => setBlurLevel(parseInt(e.target.value))}
                  className="w-full accent-aeirmist-cyan h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
                <div className="text-[8px] text-white/20 uppercase font-medium">Increase this to blur the wallpaper</div>
              </div>

              {/* brightness / Dim Level Slider */}
              <div className="space-y-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                  <span className="text-white/40 flex items-center gap-1">
                    <Eye size={12} className="text-white/40" />
                    Wallpaper Brightness
                  </span>
                  <span className="text-aeirmist-cyan font-mono">{Math.round(brightness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="5"
                  value={brightness * 100} 
                  onChange={(e) => setBrightness(parseFloat(e.target.value) / 100)}
                  className="w-full accent-aeirmist-cyan h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
                <div className="text-[8px] text-white/20 uppercase font-medium">Lower brightness makes chat text easier to read</div>
              </div>

              {/* Zoom Slider (Shown only when image active) */}
              {!(currentWallpaper.startsWith('linear-gradient') || currentWallpaper.startsWith('radial-gradient')) && (
                <div className="space-y-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl md:col-span-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                    <span className="text-white/40 flex items-center gap-1">
                       <Sliders size={12} className="text-white/40" />
                       Zoom & Reposition
                    </span>
                    <span className="text-aeirmist-cyan font-mono">{cropPosition.zoom.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="2.5" 
                    step="0.05"
                    value={cropPosition.zoom} 
                    onChange={(e) => setCropPosition(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                    className="w-full accent-aeirmist-cyan h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="text-[8px] text-white/20 uppercase font-medium">Drag on preview to reposition the image</div>
                </div>
              )}
            </div>

            {/* Parallax Toggle */}
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${parallaxEnabled ? 'bg-aeirmist-cyan/10 text-aeirmist-cyan' : 'bg-white/5 text-white/30'}`}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/80">Parallax Effect</div>
                  <div className="text-[8px] text-white/20 uppercase font-bold">Subtle motion based on movement</div>
                </div>
              </div>
              <button
                onClick={() => setParallaxEnabled(!parallaxEnabled)}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${parallaxEnabled ? 'bg-aeirmist-cyan shadow-[0_0_10px_rgba(0,242,255,0.3)]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${parallaxEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* futuristic animated visual effects */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Sparkles size={12} className="text-aeirmist-cyan" />
                Choose a Special Effect
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PRESET_EFFECTS.map((fx) => {
                  const isCurrent = fx.id === effectType;
                  return (
                    <button
                      key={fx.id}
                      onClick={() => setEffectType(fx.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCurrent 
                          ? 'border-aeirmist-cyan bg-aeirmist-cyan/5 shadow-[0_0_15px_rgba(0,242,255,0.06)]' 
                          : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-black tracking-widest ${isCurrent ? 'text-aeirmist-cyan' : 'text-white/70'}`}>
                          {fx.name}
                        </span>
                        {isCurrent && <Check size={12} className="text-aeirmist-cyan" />}
                      </div>
                      <div className="text-[8px] text-white/30 uppercase mt-1 leading-relaxed font-bold">
                        {fx.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* scope selection */}
            <div className="space-y-2 bg-black/20 border border-white/5 p-3 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
                <Info size={12} />
                Apply changes to
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSaveScope('chat')}
                  className={`py-2 px-3 rounded-xl border font-bold uppercase text-[9px] tracking-widest transition-all ${
                    saveScope === 'chat' 
                      ? 'border-aeirmist-cyan text-white bg-aeirmist-cyan/10' 
                      : 'border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                  }`}
                >
                  This Chat Only
                </button>
                <button
                  type="button"
                  onClick={() => setSaveScope('global')}
                  className={`py-2 px-3 rounded-xl border font-bold uppercase text-[9px] tracking-widest transition-all ${
                    saveScope === 'global' 
                      ? 'border-aeirmist-magenta text-white bg-aeirmist-magenta/10' 
                      : 'border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                  }`}
                >
                  All Chats
                </button>
              </div>
              <div className="text-[8px] text-white/20 uppercase tracking-wide text-center mt-1">
                {saveScope === 'chat' ? '* Save to this conversation only' : '* Save for all conversations'}
              </div>
            </div>

          </div>

          {/* Action button triggers */}
          <div className="border-t border-white/5 pt-4 mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-white/10 rounded-xl text-white/60 hover:text-white font-bold uppercase text-[10px] tracking-widest hover:border-white/20 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving || saveSuccess}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-aeirmist-cyan via-aeirmist-magenta to-aeirmist-cyan bg-[length:200%_auto] hover:bg-right font-black uppercase text-[10px] tracking-widest text-black flex items-center justify-center gap-2 transition-all duration-500 shadow-[0_0_20px_rgba(0,242,255,0.2)] hover:shadow-[0_0_30px_rgba(255,0,234,0.4)] hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin text-black" size={14} />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="text-black" />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={14} className="text-black" />
                  Save Settings
                </>
              )}
            </button>
          </div>

        </div>

      </motion.div>
    </div>
  );
};
