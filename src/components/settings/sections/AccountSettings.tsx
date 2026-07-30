import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Camera, Mail, ShieldCheck, Phone, Calendar, MapPin, Globe, Info, 
  Trash2, Download, Check, AlertCircle, Save, FileText, CheckCircle2, 
  X, RefreshCw, Eye, Sparkles, AlertTriangle, ShieldAlert, Award, Tag, LogOut, ExternalLink
} from 'lucide-react';
import { getAvatarUrl } from '../../../lib/avatar';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useTheme } from '../../../context/ThemeContext';

interface AccountSettingsProps {
  formData: any;
  handleFieldChange: (field: string, value: any) => void;
  handleAvatarUpload: () => void;
  handleBannerUpload: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  bannerInputRef: React.RefObject<HTMLInputElement>;
  localAvatarURL: string | null;
  localCoverURL: string | null;
  setLocalAvatarURL: (v: string | null) => void;
  setLocalCoverURL: (v: string | null) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  handleUpdate: () => Promise<void>;
  profile: any;
  user: any;
  checkUsernameAvailable: (username: string) => Promise<{ available: boolean; suggestions?: string[] }>;
  unlinkAccountMethod: (providerId: string) => Promise<void>;
  linkAccountMethod: (provider: string) => Promise<void>;
  requestDeleteAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addToast?: (toast: { title: string; message: string; type: 'success' | 'warning' | 'info' }) => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  formData,
  handleFieldChange,
  handleAvatarUpload,
  handleBannerUpload,
  handleFileSelect,
  fileInputRef,
  bannerInputRef,
  localAvatarURL,
  localCoverURL,
  setLocalAvatarURL,
  setLocalCoverURL,
  isSaving,
  saveSuccess,
  handleUpdate,
  profile,
  user,
  checkUsernameAvailable,
  unlinkAccountMethod,
  linkAccountMethod,
  requestDeleteAccount,
  deleteAccount,
  addToast
}) => {
  const { activeTheme } = useTheme();
  const isLight = activeTheme?.isLight;

  // Username Checker States
  const [usernameInput, setUsernameInput] = useState(formData.username || '');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  // Action Confirmation Modal States
  const [showPreview, setShowPreview] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isProcessingDangerAction, setIsProcessingDangerAction] = useState(false);

  // Email state change
  const [newEmail, setNewEmail] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Profile completion fields calculation
  const calculateCompletion = () => {
    const fields = [
      formData.displayName,
      formData.username,
      formData.bio,
      formData.website,
      formData.pronouns,
      formData.dateOfBirth,
      formData.gender,
      formData.location,
      formData.photoURL,
      formData.bannerURL
    ];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  };
  const completionPercentage = calculateCompletion();

  // Handle Unsaved Changes Tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    if (!profile) return;
    const changed = Object.keys(formData).some(key => {
      if (key === 'socialLinks') {
        return Object.keys(formData.socialLinks || {}).some(
          sKey => (formData.socialLinks?.[sKey] || '') !== (profile.socialLinks?.[sKey] || '')
        );
      }
      if (key === 'privacySettings' || key === 'themeSettings') {
        return JSON.stringify(formData[key]) !== JSON.stringify(profile[key]);
      }
      return (formData[key] ?? '') !== (profile[key] ?? '');
    });
    setHasUnsavedChanges(changed);
  }, [formData, profile]);

  const resetForm = () => {
    if (!profile) return;
    Object.keys(formData).forEach(key => {
      handleFieldChange(key, profile[key]);
    });
    setLocalAvatarURL(null);
    setLocalCoverURL(null);
    addToast?.({
      title: 'FORM RESET',
      message: 'All unsaved changes have been restored to their original values.',
      type: 'info'
    });
  };

  const handleSaveClick = async () => {
    try {
      await handleUpdate();
      setHasUnsavedChanges(false);
    } catch (e: any) {
      addToast?.({
        title: 'SAVE ERROR',
        message: e.message || 'An error occurred while saving.',
        type: 'warning'
      });
    }
  };

  // Username validation logic
  useEffect(() => {
    if (!usernameInput) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    if (usernameInput.toLowerCase() === (profile?.username || '').toLowerCase()) {
      setUsernameStatus('available');
      setUsernameError('');
      return;
    }

    if (usernameInput.length < 3) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    if (usernameInput.length > 30) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be 30 characters or less.');
      return;
    }

    const regex = /^[a-z0-9_.]+$/;
    if (!regex.test(usernameInput)) {
      setUsernameStatus('invalid');
      setUsernameError('Only lowercase letters, numbers, underscores, and periods are allowed.');
      return;
    }

    setUsernameError('');
    setUsernameStatus('checking');
    setCheckingUsername(true);

    const debounce = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailable(usernameInput);
        if (res.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
          // Generate high quality fallback suggestions
          const suggested = res.suggestions || [
            usernameInput + '_official',
            usernameInput + '99',
            usernameInput + '_dev'
          ];
          setUsernameSuggestions(suggested);
        }
      } catch (err) {
        setUsernameStatus('invalid');
        setUsernameError('Could not verify username.');
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [usernameInput, profile?.username]);

  const applyUsernameSuggestion = (suggestion: string) => {
    setUsernameInput(suggestion);
    handleFieldChange('username', suggestion);
    addToast?.({
      title: 'SUGGESTION APPLIED',
      message: `Username updated to @${suggestion}`,
      type: 'success'
    });
  };

  const commitUsernameChange = async () => {
    if (usernameStatus !== 'available') {
      addToast?.({
        title: 'INVALID USERNAME',
        message: 'Please choose an available username first.',
        type: 'warning'
      });
      return;
    }
    handleFieldChange('username', usernameInput);
    addToast?.({
      title: 'USERNAME SET',
      message: 'Username set in state. Please commit your changes to apply.',
      type: 'info'
    });
  };

  // Real data export function
  const handleDownloadConfirm = async () => {
    setIsProcessingDangerAction(true);
    try {
      addToast?.({
        title: 'EXPORT INITIALIZED',
        message: 'Active Devices are gathering your distributed data artifacts...',
        type: 'info'
      });

      const exportData: any = {
        version: "2.0",
        exportTime: new Date().toISOString(),
        user: {
          uid: user?.uid,
          email: user?.email,
          createdAt: user?.metadata?.creationTime
        },
        profile: formData
      };

      // 1. Fetch Posts
      const postsSnap = await getDocs(query(collection(db, 'posts'), where('userId', '==', user.uid)));
      exportData.posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Fetch Stores/Products
      const storesSnap = await getDocs(query(collection(db, 'stores'), where('ownerUid', '==', user.uid)));
      exportData.stores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const productPromises = exportData.stores.map((s: any) => 
        getDocs(query(collection(db, 'products'), where('storeId', '==', s.id)))
      );
      const productSnaps = await Promise.all(productPromises);
      exportData.products = productSnaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Fetch Orders
      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('buyerId', '==', user.uid)));
      exportData.orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aeirmist-data-export-${formData.username || 'profile'}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast?.({
        title: 'EXPORT COMPLETE',
        message: 'Your data archive has been generated and downloaded.',
        type: 'success'
      });
    } catch (err) {
      console.error("Export failed:", err);
      addToast?.({
        title: 'EXPORT FAILED',
        message: 'Failed to save data archive.',
        type: 'warning'
      });
    } finally {
      setIsProcessingDangerAction(false);
      setShowDownloadConfirm(false);
    }
  };

  // Deactivate handler
  const handleDeactivateConfirm = async () => {
    setIsProcessingDangerAction(true);
    try {
      handleFieldChange('isDeactivated', true);
      await handleUpdate();
      addToast?.({
        title: 'ACCOUNT DEACTIVATED',
        message: 'Your profile has been hidden. Log back in to reactivate.',
        type: 'info'
      });
      setShowDeactivateConfirm(false);
    } catch (err: any) {
      addToast?.({
        title: 'DEACTIVATION ERROR',
        message: err.message || 'Could not deactivate account.',
        type: 'warning'
      });
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== (profile?.username || '')) {
      addToast?.({
        title: 'CONFIRMATION MISMATCH',
        message: 'Please type your exact current username to confirm.',
        type: 'warning'
      });
      return;
    }
    setIsProcessingDangerAction(true);
    try {
      await deleteAccount();
      addToast?.({
        title: 'ACCOUNT PERMANENTLY DELETED',
        message: 'Your account and all associated data have been wiped from the system.',
        type: 'success'
      });
      setShowDeleteConfirm(false);
    } catch (err: any) {
      addToast?.({
        title: 'DELETE ERROR',
        message: err.message || 'Failed to initialize account purge.',
        type: 'warning'
      });
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const categories = [
    "Creator",
    "Developer",
    "Designer",
    "Musician",
    "Artist",
    "Writer",
    "Gamer",
    "Influencer",
    "Other"
  ];

  return (
    <div className="w-full relative">
      {/* Dynamic Floating Sticky Save Bar (On Mobile or when screen scrolls) */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-[88px] md:bottom-6 left-4 right-4 mx-auto z-40 flex items-center justify-between gap-4 px-5 py-3.5 bg-[#0b0e14]/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl max-w-lg w-auto"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-aeirmist-cyan animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.7)]" />
              <div className="text-xs font-mono font-bold text-white/80">Uncommitted Changes</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-aeirmist-cyan text-black hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.4)]"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={12} /> : <Check size={12} />}
                {isSaving ? 'Syncing...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-full overflow-hidden">
        
        {/* LEFT COLUMN: PROFILE SUMMARY CARD */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-6">
          <div className={`relative rounded-[2rem] p-6 shadow-2xl overflow-hidden group border transition-all ${
            isLight 
              ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
              : 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/15 text-white shadow-2xl'
          }`}>
            
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-aeirmist-cyan/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* LARGE COVER PHOTO */}
            <div className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 mb-14 group/cover cursor-pointer">
              <input 
                type="file" 
                ref={bannerInputRef} 
                className="hidden" 
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleFileSelect(e, 'banner')}
                accept="image/*"
              />
              {(localCoverURL || formData.bannerURL) ? (
                <img 
                  src={localCoverURL || formData.bannerURL} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105" 
                  alt="Cover" 
                />
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No Cover Photo</span>
                </div>
              )}
              
              {/* Hover Overlay */}
              <div 
                onClick={() => bannerInputRef.current?.click()} 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 backdrop-blur-xs"
              >
                <Camera size={18} className="text-aeirmist-cyan mb-1" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-aeirmist-cyan">Change Cover</span>
              </div>
            </div>

            {/* PROFILE PICTURE (ROUNDED RECTANGLE - NOT CIRCULAR) */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 group/avatar cursor-pointer">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleFileSelect(e, 'avatar')}
                accept="image/*"
              />
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-[#121620] bg-slate-200 dark:bg-[#121620] shadow-xl group-hover/avatar:border-aeirmist-cyan transition-all">
                <img 
                  src={localAvatarURL || getAvatarUrl(formData.photoURL)} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                />
                
                {/* Hover Overlay */}
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="absolute inset-0 bg-black/65 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200"
                >
                  <Camera size={16} className="text-aeirmist-cyan mb-1" />
                  <span className="text-[8px] uppercase font-bold tracking-wider text-aeirmist-cyan">Change</span>
                </div>
              </div>
            </div>

            {/* DISPLAY NAME & USERNAME */}
            <div className="text-center mt-2 space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{formData.displayName || 'Unnamed User'}</h3>
                {profile?.isVerified && (
                  <ShieldCheck className="text-aeirmist-cyan shrink-0" size={16} />
                )}
              </div>
              <p className="text-xs font-mono text-aeirmist-cyan font-bold">@{formData.username || 'username'}</p>
            </div>

            {/* BIO BRIEF */}
            <p className={`text-xs text-center mt-3 line-clamp-2 italic px-2 ${isLight ? 'text-slate-600' : 'text-white/80'}`}>
              {formData.bio || 'No biography written yet.'}
            </p>

            {/* FOLLOWERS / FOLLOWING METRICS */}
            <div className="grid grid-cols-2 gap-4 border-y border-slate-200 dark:border-white/10 py-3.5 mt-4 text-center">
              <div>
                <span className={`block text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {Array.isArray(profile?.social?.followers) ? profile.social.followers.length : Math.max(0, profile?.followersCount || 0)}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Followers</span>
              </div>
              <div className="border-l border-slate-200 dark:border-white/10">
                <span className={`block text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {Array.isArray(profile?.social?.following) ? profile.social.following.length : Math.max(0, profile?.followingCount || 0)}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Following</span>
              </div>
            </div>

            {/* ACCOUNT TYPE BADGE */}
            <div className="flex items-center justify-between mt-4 px-1">
              <span className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-white/70'}`}>Account Visibility</span>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                formData.privacySettings?.privateProfile 
                  ? 'bg-aeirmist-magenta/10 border-aeirmist-magenta/30 text-aeirmist-magenta' 
                  : 'bg-aeirmist-cyan/10 border-aeirmist-cyan/30 text-aeirmist-cyan'
              }`}>
                {formData.privacySettings?.privateProfile ? 'Private' : 'Public'}
              </span>
            </div>

            {/* PROFILE COMPLETION */}
            <div className={`mt-5 rounded-2xl p-3.5 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-white/10'}`}>
              <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>PROFILE COMPLETION</span>
                <span className="text-aeirmist-cyan font-bold">{completionPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-aeirmist-cyan to-aeirmist-magenta rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* CONTROL BUTTONS */}
            <div className="grid grid-cols-1 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => scrollToSection('profile-information')}
                className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                }`}
              >
                Edit Profile Info
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-aeirmist-cyan/10 hover:bg-aeirmist-cyan/20 border border-aeirmist-cyan/35 text-aeirmist-cyan transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye size={12} />
                Preview Profile
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: EDITABLE SECTIONS */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECTION 2: PROFILE INFORMATION */}
          <div id="profile-information" className={`rounded-3xl p-6 md:p-8 shadow-xl space-y-6 relative transition-all border ${
            isLight 
              ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
              : 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/15 text-white shadow-2xl'
          }`}>
            <div className="space-y-1 border-b pb-4 border-slate-200 dark:border-white/10">
              <h2 className={`text-xl font-display font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <User size={18} className="text-aeirmist-cyan" />
                Personal Information
              </h2>
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-white/70'}`}>Update your name, bio, tagline, and profile details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Full Name / Display Name</label>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{(formData.displayName || '').length}/50</span>
                </div>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <input 
                    type="text"
                    maxLength={50}
                    value={formData.displayName}
                    onChange={(e) => handleFieldChange('displayName', e.target.value)}
                    placeholder="e.g. John Doe"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aeirmist-cyan/20'
                        : 'bg-slate-800/90 border border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-800'
                    }`}
                  />
                </div>
                <p className={`text-[10px] ml-1 ${isLight ? 'text-slate-600' : 'text-white/70'}`}>Your full name shown on your public profile.</p>
              </div>

              {/* Tagline Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Tagline / Status</label>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{(formData.tagline || '').length}/100</span>
                </div>
                <div className="relative">
                  <Sparkles className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <input 
                    type="text"
                    maxLength={100}
                    value={formData.tagline || ''}
                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                    placeholder="e.g. Creator & Developer"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aeirmist-cyan/20'
                        : 'bg-slate-800/90 border border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-800'
                    }`}
                  />
                </div>
                <p className={`text-[10px] ml-1 ${isLight ? 'text-slate-600' : 'text-white/70'}`}>A short tagline or tagline displayed on your profile card.</p>
              </div>
            </div>

            {/* Bio Textarea */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Bio / About You</label>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{(formData.bio || '').length}/300 characters</span>
              </div>
              <textarea 
                value={formData.bio}
                maxLength={300}
                rows={4}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                placeholder="Tell others a little bit about yourself, your work, or interests..."
                className={`w-full p-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all resize-none ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aeirmist-cyan/20'
                    : 'bg-slate-800/90 border border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-800'
                }`}
              />
              <p className={`text-[10px] ml-1 ${isLight ? 'text-slate-600' : 'text-white/70'}`}>Write a short intro about yourself.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Website Input */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Website</label>
                <div className="relative">
                  <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <input 
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    placeholder="https://yoursite.com"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aeirmist-cyan/20'
                        : 'bg-slate-800/90 border border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Location Input */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Location</label>
                <div className="relative">
                  <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <input 
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aeirmist-cyan/20'
                        : 'bg-slate-800/90 border border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Category</label>
                <div className="relative">
                  <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <select
                    value={formData.category || ''}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all appearance-none cursor-pointer ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900'
                        : 'bg-slate-800/90 border border-slate-600 text-white'
                    }`}
                  >
                    <option value="" className={isLight ? 'bg-white' : 'bg-slate-900'}>Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className={isLight ? 'bg-white' : 'bg-slate-900'}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Pronouns */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Pronouns</label>
                <div className="relative">
                  <Info className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <input 
                    type="text"
                    value={formData.pronouns || ''}
                    onChange={(e) => handleFieldChange('pronouns', e.target.value)}
                    placeholder="e.g. they/them"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aeirmist-cyan/20'
                        : 'bg-slate-800/90 border border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Birthday</label>
                <div className="relative">
                  <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <input 
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900'
                        : 'bg-slate-800/90 border border-slate-600 text-white [color-scheme:dark]'
                    }`}
                  />
                </div>
              </div>

              {/* Gender Select */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Gender</label>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-white/60'}`} size={15} />
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-xs font-medium focus:border-aeirmist-cyan focus:outline-none transition-all appearance-none cursor-pointer ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900'
                        : 'bg-slate-800/90 border border-slate-600 text-white'
                    }`}
                  >
                    <option value="" className={isLight ? 'bg-white' : 'bg-slate-900'}>Not Specified</option>
                    <option value="male" className={isLight ? 'bg-white' : 'bg-slate-900'}>Male</option>
                    <option value="female" className={isLight ? 'bg-white' : 'bg-slate-900'}>Female</option>
                    <option value="nonbinary" className={isLight ? 'bg-white' : 'bg-slate-900'}>Non-Binary</option>
                    <option value="prefer_not_to_say" className={isLight ? 'bg-white' : 'bg-slate-900'}>Prefer Not to Say</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT INFORMATION */}
          <div id="contact-information" className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="space-y-1 border-b border-white/5 pb-4">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Mail size={18} className="text-aeirmist-cyan" />
                Contact Credentials
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Secure connection endpoints and notification paths</p>
            </div>

            {/* Email Field with Verified status and action */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35 ml-1">Primary Registered Email</label>
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-aeirmist-cyan/10 flex items-center justify-center text-aeirmist-cyan">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold text-white/85">{user?.email || 'unregistered@email.com'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {user?.emailVerified ? (
                        <>
                          <ShieldCheck size={13} className="text-aeirmist-cyan" />
                          <span className="text-[9px] font-mono font-bold text-aeirmist-cyan uppercase tracking-wider">VERIFIED ADAPTER</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} className="text-aeirmist-magenta" />
                          <span className="text-[9px] font-mono font-bold text-aeirmist-magenta uppercase tracking-wider">UNVERIFIED IDENTITY</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!user?.emailVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        addToast?.({
                          title: 'VERIFICATION SENT',
                          message: 'A fresh verification ticket has been beamed to your registered email.',
                          type: 'info'
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest bg-aeirmist-cyan/10 border border-aeirmist-cyan/30 text-aeirmist-cyan hover:bg-aeirmist-cyan/20 transition-all cursor-pointer"
                    >
                      Verify Email
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmail(user?.email || '');
                      setShowEmailModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Phone Input with Country Selector */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35 ml-1">Verified Mobile (Phone)</label>
                <div className="flex gap-2">
                  <select className="w-20 h-12 bg-[#0b0e14]/50 border border-white/10 rounded-xl text-xs text-white/60 focus:outline-none transition-all cursor-pointer">
                    <option value="+1">+1 US</option>
                    <option value="+44">+44 UK</option>
                    <option value="+880">+880 BD</option>
                    <option value="+91">+91 IN</option>
                    <option value="+81">+81 JP</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                    <input 
                      type="tel"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                      placeholder="Enter mobile digits..."
                      className="w-full h-12 pl-11 pr-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs focus:border-aeirmist-cyan/50 focus:bg-white/[0.05] focus:outline-none transition-all text-white/80"
                    />
                  </div>
                </div>
              </div>

              {/* Verify Number Action button */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    addToast?.({
                      title: 'PHONE VERIFIED',
                      message: 'Mobile link successfully authenticated and paired.',
                      type: 'success'
                    });
                  }}
                  disabled={!formData.phoneNumber}
                  className={`w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.phoneNumber 
                      ? 'bg-aeirmist-cyan/10 hover:bg-aeirmist-cyan/20 border-aeirmist-cyan/30 text-aeirmist-cyan'
                      : 'bg-white/5 border-white/5 text-white/20 pointer-events-none'
                  }`}
                >
                  <CheckCircle2 size={12} />
                  Verify Mobile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Recovery Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35 ml-1">Recovery Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                  <input 
                    type="email"
                    value={formData.recoveryEmail || ''}
                    onChange={(e) => handleFieldChange('recoveryEmail', e.target.value)}
                    placeholder="backup@email.com"
                    className="w-full h-12 pl-11 pr-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs focus:border-aeirmist-cyan/50 focus:bg-white/[0.05] focus:outline-none transition-all text-white/80"
                  />
                </div>
                <p className="text-[8px] text-white/25 ml-1">Alternative address used to recover authentication locks.</p>
              </div>

              {/* Recovery Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35 ml-1">Recovery Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                  <input 
                    type="tel"
                    value={formData.recoveryPhone || ''}
                    onChange={(e) => handleFieldChange('recoveryPhone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full h-12 pl-11 pr-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs focus:border-aeirmist-cyan/50 focus:bg-white/[0.05] focus:outline-none transition-all text-white/80"
                  />
                </div>
                <p className="text-[8px] text-white/25 ml-1">Alternative SMS route used to receive emergency MFA codes.</p>
              </div>
            </div>

          </div>

          {/* SECTION 4: ACCOUNT STATUS */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="space-y-1 border-b border-white/5 pb-4">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-aeirmist-cyan" />
                Account Status
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Standard metadata and profile diagnostic details</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Field 1: Visibility */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                <span className="text-[8px] uppercase tracking-wider text-white/45 block mb-1">Account Visibility</span>
                <span className="text-xs font-bold text-white font-mono">
                  {formData.privacySettings?.privateProfile ? 'Private Account' : 'Public Account'}
                </span>
              </div>

              {/* Field 2: Verified */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between">
                <span className="text-[8px] uppercase tracking-wider text-white/45 block mb-1">Verified Member</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-mono">
                    {profile?.isVerified ? 'Yes' : 'No'}
                  </span>
                  {profile?.isVerified && (
                    <ShieldCheck className="text-aeirmist-cyan shrink-0" size={14} />
                  )}
                </div>
              </div>

              {/* Field 3: Member Since */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                <span className="text-[8px] uppercase tracking-wider text-white/45 block mb-1">Joined Network</span>
                <span className="text-xs font-bold text-white font-mono">
                  {user?.metadata?.creationTime 
                    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'July 10, 2026'}
                </span>
              </div>

              {/* Field 4: Completion */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                <span className="text-[8px] uppercase tracking-wider text-white/45 block mb-1">Dossier Integrity</span>
                <span className="text-xs font-bold text-aeirmist-cyan font-mono">
                  {completionPercentage}% Complete
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: USERNAME */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="space-y-1 border-b border-white/5 pb-4">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-aeirmist-cyan" />
                Username Settings
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Manage your exclusive unique social address</p>
            </div>

            <div className="space-y-4">
              {/* Current Username Info */}
              <div className="flex justify-between items-center text-xs font-mono bg-white/[0.01] p-3 rounded-xl border border-white/5">
                <span className="text-white/40">Current Registered handle:</span>
                <span className="text-aeirmist-cyan font-bold">@{profile?.username || 'unregistered'}</span>
              </div>

              {/* Change Handle Input Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35 ml-1">New Proposed Username</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-aeirmist-cyan font-mono font-bold text-xs">@</span>
                    <input 
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toLowerCase().trim())}
                      placeholder="unique_id"
                      className="w-full h-12 pl-8 pr-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs focus:border-aeirmist-cyan/50 focus:bg-white/[0.05] focus:outline-none transition-all text-white/80 font-mono"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={commitUsernameChange}
                    disabled={usernameStatus !== 'available' || checkingUsername}
                    className={`h-12 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      usernameStatus === 'available' && !checkingUsername
                        ? 'bg-aeirmist-cyan text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                        : 'bg-white/5 border border-white/5 text-white/20 pointer-events-none'
                    }`}
                  >
                    Claim Username
                  </button>
                </div>

                {/* Validation Status Message */}
                <div className="mt-1.5 min-h-[16px]">
                  {checkingUsername && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 animate-pulse">
                      <RefreshCw size={10} className="animate-spin" />
                      Scanning global registries...
                    </div>
                  )}
                  {!checkingUsername && usernameStatus === 'available' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-aeirmist-lime font-bold">
                      <Check size={12} />
                      Handle is available and ready for pairing!
                    </div>
                  )}
                  {!checkingUsername && usernameStatus === 'taken' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-aeirmist-magenta font-bold">
                      <X size={12} />
                      This address is already allocated to another member.
                    </div>
                  )}
                  {!checkingUsername && usernameStatus === 'invalid' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-aeirmist-magenta font-bold">
                      <AlertCircle size={12} />
                      {usernameError}
                    </div>
                  )}
                </div>
              </div>

              {/* Handle suggestions when taken */}
              {!checkingUsername && usernameStatus === 'taken' && (
                <div className="bg-aeirmist-magenta/5 border border-aeirmist-magenta/25 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] uppercase tracking-wider text-aeirmist-magenta font-black">Available Suggestions:</span>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => applyUsernameSuggestion(sug)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/80 hover:text-white transition-colors cursor-pointer"
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Username rules */}
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-[9px] text-white/35 space-y-2">
                <span className="font-bold text-white/50 uppercase tracking-widest block">Handle Allocation Rules:</span>
                <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                  <li>Handles must contain at least 3 characters and no more than 30 characters.</li>
                  <li>Only standard lowercase alphanumeric characters, underscores (<code className="font-mono text-white/65">_</code>), and periods (<code className="font-mono text-white/65">.</code>) are allowed.</li>
                  <li>Handles cannot start or end with punctuation, and cannot contain double symbols.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 6: ACCOUNT ACTIONS (Danger Zone) */}
          <div className="rounded-3xl border border-red-500/10 bg-red-500/[0.01] p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="space-y-1 border-b border-red-500/10 pb-4">
              <h2 className="text-xl font-display font-bold text-red-400 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                Danger Zone & Data Actions
              </h2>
              <p className="text-xs text-red-500/40 uppercase tracking-widest font-bold">Sensitive actions regarding data extraction and profile integrity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Download My Data card */}
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Download My Social Data</h4>
                  <p className="text-[10px] text-white/35 leading-relaxed mt-1">Get a complete machine-readable archive of your profile details, connections, and metadata in JSON format.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDownloadConfirm(true)}
                  className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={12} />
                  Download Data Package
                </button>
              </div>

              {/* Export Profile card */}
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Export Social Profile</h4>
                  <p className="text-[10px] text-white/35 leading-relaxed mt-1">Directly generate a portable copy of your public profile settings and links to transfer or back up.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const profileData = JSON.stringify(formData, null, 2);
                    navigator.clipboard.writeText(profileData);
                    addToast?.({
                      title: 'COPIED TO CLIPBOARD',
                      message: 'Profile configuration JSON has been exported to your clipboard.',
                      type: 'success'
                    });
                  }}
                  className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText size={12} />
                  Copy Config JSON
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Deactivate account card */}
              <div className="p-5 rounded-2xl border border-red-500/10 bg-red-500/[0.01] flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Temporarily Deactivate</h4>
                  <p className="text-[10px] text-white/35 leading-relaxed mt-1">Temporarily shut down your profile. Your page will be hidden from everyone. Reactivate instantly anytime by signing back in.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(true)}
                  className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-[#201013] hover:bg-[#34161b] border border-red-500/20 text-red-400 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Deactivate Profile
                </button>
              </div>

              {/* Delete account card */}
              <div className="p-5 rounded-2xl border border-red-500/15 bg-red-500/[0.02] flex flex-col justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Permanently Delete</h4>
                  <p className="text-[10px] text-red-500/40 leading-relaxed mt-1">Completely delete all account details, credentials, profile information, and storage attachments. This is irreversible after 30 days.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                >
                  <Trash2 size={12} />
                  Purge Profile Account
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* POPUP MODAL 1: PREVIEW PROFILE SCREEN */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
            >
              
              {/* Banner Area */}
              <div className="h-28 relative overflow-hidden bg-white/5 flex-shrink-0">
                {(localCoverURL || formData.bannerURL) && (
                  <img src={localCoverURL || formData.bannerURL} className="w-full h-full object-cover" alt="Banner" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Avatar Overlap */}
              <div className="px-6 pb-6 relative flex flex-col items-center text-center -mt-10">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#0d1117] bg-[#0d1117] shadow-lg mb-3">
                  <img src={localAvatarURL || getAvatarUrl(formData.photoURL)} className="w-full h-full object-cover" alt="Avatar" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <h4 className="text-base font-bold text-white">{formData.displayName || 'Unnamed User'}</h4>
                    {profile?.isVerified && (
                      <ShieldCheck className="text-aeirmist-cyan shrink-0" size={15} />
                    )}
                  </div>
                  <p className="text-xs text-aeirmist-cyan font-mono font-bold">@{formData.username || 'username'}</p>
                </div>

                {formData.category && (
                  <span className="mt-2.5 inline-block text-[8px] font-bold font-mono uppercase tracking-widest px-2.5 py-1 bg-aeirmist-cyan/10 border border-aeirmist-cyan/35 text-aeirmist-cyan rounded-full">
                    {formData.category}
                  </span>
                )}

                {formData.tagline && (
                  <p className="text-[10px] text-white/50 italic mt-3 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl">
                    "{formData.tagline}"
                  </p>
                )}

                <p className="text-xs text-white/70 leading-relaxed mt-4 max-w-sm">
                  {formData.bio || 'This member hasn\'t configured a bio signal yet.'}
                </p>

                {/* Meta details */}
                <div className="mt-4 pt-4 border-t border-white/5 w-full grid grid-cols-2 gap-3 text-left">
                  {formData.location && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <MapPin size={12} className="text-aeirmist-cyan shrink-0" />
                      <span className="truncate">{formData.location}</span>
                    </div>
                  )}
                  {formData.website && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <Globe size={12} className="text-aeirmist-cyan shrink-0" />
                      <span className="truncate">{formData.website}</span>
                    </div>
                  )}
                  {formData.pronouns && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <Info size={12} className="text-aeirmist-cyan shrink-0" />
                      <span className="truncate">{formData.pronouns}</span>
                    </div>
                  )}
                  {formData.gender && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <User size={12} className="text-aeirmist-cyan shrink-0" />
                      <span className="truncate capitalize">{formData.gender.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 mt-6 w-full">
                  <button onClick={() => console.log("Action coming soon")} className="flex-1 py-2 rounded-xl bg-aeirmist-cyan text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(0,242,255,0.2)]">
                    Follow
                  </button>
                  <button onClick={() => console.log("Action coming soon")} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider">
                    Message
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL 2: DOWNLOAD DATA CONFIRMATION */}
      <AnimatePresence>
        {showDownloadConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadConfirm(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#121620] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-aeirmist-cyan/10 text-aeirmist-cyan flex items-center justify-center mx-auto">
                <Download size={22} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Download Data Archive</h3>
                <p className="text-xs text-white/40">We will bundle and download all your profile parameters, links, and database attachments into a raw portable JSON data snapshot.</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDownloadConfirm(false)}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDownloadConfirm}
                  disabled={isProcessingDangerAction}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-aeirmist-cyan text-black hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                >
                  {isProcessingDangerAction ? <RefreshCw className="animate-spin" size={10} /> : null}
                  {isProcessingDangerAction ? 'Packing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL 3: DEACTIVATE CONFIRMATION */}
      <AnimatePresence>
        {showDeactivateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeactivateConfirm(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#121620] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle size={22} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Deactivate Profile?</h3>
                <p className="text-xs text-white/40">This will temporarily hide your profile, connections, and posts across the entire platform. Log back in at any time to instantly restore your identity.</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-white/60 hover:text-white"
                >
                  Keep Active
                </button>
                <button
                  type="button"
                  onClick={handleDeactivateConfirm}
                  disabled={isProcessingDangerAction}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-[#201013] hover:bg-[#34161b] border border-red-500/20 text-red-400 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isProcessingDangerAction ? <RefreshCw className="animate-spin" size={10} /> : null}
                  {isProcessingDangerAction ? 'Processing...' : 'Deactivate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL 4: DELETE CONFIRMATION */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#1a0e11] border border-red-500/15 rounded-2xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={22} className="animate-pulse" />
              </div>
              
              <div className="space-y-1 text-center">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">PERMANENT DELETE ACCOUNT</h3>
                <p className="text-xs text-red-400/60 leading-relaxed">This action starts an irreversible delete sequence. Your profile and everything you have uploaded will be wiped clean after 30 days hold.</p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[8.5px] uppercase tracking-widest text-white/40 block">Type <code className="text-white bg-white/5 px-1 py-0.5 rounded font-mono font-bold">@{profile?.username || 'username'}</code> to confirm:</label>
                <input 
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`@${profile?.username || 'username'}`}
                  className="w-full h-11 px-4 bg-[#120a0c] border border-red-500/20 focus:border-red-500 rounded-xl text-xs text-white placeholder:text-white/10 text-center font-mono focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-white/60 hover:text-white"
                >
                  Cancel Purge
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isProcessingDangerAction || deleteConfirmText !== (profile?.username || '')}
                  className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
                    deleteConfirmText === (profile?.username || '')
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-white/5 text-white/10 pointer-events-none'
                  }`}
                >
                  {isProcessingDangerAction ? <RefreshCw className="animate-spin" size={10} /> : null}
                  {isProcessingDangerAction ? 'Purging...' : 'Initiate Purge'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL 5: CHANGE EMAIL */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#121620] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-aeirmist-cyan/10 text-aeirmist-cyan flex items-center justify-center mx-auto">
                <Mail size={22} />
              </div>
              
              <div className="space-y-1 text-center">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Change Primary Email</h3>
                <p className="text-xs text-white/40">Enter your new connection address. You will be requested to verify this address.</p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[8.5px] uppercase tracking-widest text-white/40 block">Proposed New Email Address</label>
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full h-11 px-4 bg-[#0b0e14]/50 border border-white/10 focus:border-aeirmist-cyan rounded-xl text-xs text-white font-mono focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newEmail || !newEmail.includes('@')) {
                      addToast?.({
                        title: 'INVALID EMAIL',
                        message: 'Please provide a valid email format.',
                        type: 'warning'
                      });
                      return;
                    }
                    try {
                      // Perform field change & notify
                      handleFieldChange('personalEmail', newEmail);
                      addToast?.({
                        title: 'EMAIL UPDATED',
                        message: 'Your registered email address has been updated.',
                        type: 'success'
                      });
                      setShowEmailModal(false);
                    } catch (err: any) {
                      addToast?.({
                        title: 'UPDATE ERROR',
                        message: err.message || 'Could not update email.',
                        type: 'warning'
                      });
                    }
                  }}
                  className="py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-aeirmist-cyan text-black hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                >
                  Update Email
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountSettings;
