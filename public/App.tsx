
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowPathIcon, 
  DocumentArrowDownIcon, 
  SparklesIcon, 
  PhotoIcon, 
  CheckCircleIcon, 
  RocketLaunchIcon, 
  InboxStackIcon, 
  XMarkIcon, 
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ScaleIcon,
  InboxIcon,
  CheckBadgeIcon,
  RectangleGroupIcon,
  ClipboardIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline';
import { GoogleGenAI } from "@google/genai";
import { generatePinterestCampaign } from './services/geminiService';
import { uploadToPublicHost } from './services/imageHostService';
import { CampaignResult, GenerationState, AppSettings, PinVariation } from './types';
import { exportToPinterestCSV, generateCSVString } from './utils/csv';
import { scheduleCampaign } from './utils/scheduling';

/**
 * STYLE ICON SELECTOR
 */
const StyleIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'Editorial': return <DocumentTextIcon className={className} />;
    case 'Lifestyle': return <PhotoIcon className={className} />;
    case 'Collage': return <Squares2X2Icon className={className} />;
    case 'StepFeature': return <RectangleGroupIcon className={className} />;
    case 'CloseUpWide': return <ViewColumnsIcon className={className} />;
    default: return <SparklesIcon className={className} />;
  }
};

/**
 * PIN STUDIO CARD - Professional Content Card with Integrated Cloud Sync & Retry Logic
 */
const PinStudioCard: React.FC<{
  pin: PinVariation;
  sourceUrl: string;
  onExpand: (url: string) => void;
  onSyncComplete: (base64: string, publicUrl: string) => void;
}> = ({ pin, sourceUrl, onExpand, onSyncComplete }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(pin.generatedImageUrl || null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performCloudSync = useCallback(async (base64: string) => {
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadToPublicHost(base64);
      onSyncComplete(base64, publicUrl);
    } catch (err: any) {
      setError("Cloud sync failed. Re-syncing...");
      console.error(err);
      // Optional: Auto-retry sync once
      setTimeout(() => performCloudSync(base64), 3000);
    } finally {
      setUploading(false);
    }
  }, [onSyncComplete]);

  const generateImage = useCallback(async () => {
    if (imageUrl || loading) return;
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const styleTemplates: Record<string, string> = {
        Editorial: "Magazine-style composition. Large centered subject. Minimal clean background. High-end Pinterest editorial aesthetic.",
        Lifestyle: "Real-life aspirational environment. Natural warm lighting. Cozy, authentic context.",
        Collage: "Collage Layout (MANDATORY). Use 2-4 distinct visual panels showing different angles. Clean grid lines.",
        StepFeature: "Educational Infographic Layout. 2-3 sections showing steps, a 'before/after', or a feature breakdown.",
        CloseUpWide: "Modern Split Layout. One extreme close-up detail shot and one wide contextual shot combined."
      };

      const selectedTemplate = styleTemplates[pin.visualStrategy.styleType] || styleTemplates.Editorial;

      const finalPrompt = `
        Create a high-impact, Pinterest-optimized vertical image (2:3 ratio) designed for maximum clicks and saves.
        LAYOUT STYLE: ${pin.visualStrategy.styleType}
        STYLE PROTOCOL: ${selectedTemplate}
        
        CRITICAL: THIS IMAGE MUST INCLUDE LARGE, BOLD, HIGHLY READABLE OVERLAY TEXT DIRECTLY ON THE IMAGE.
        THE OVERLAY TEXT TO RENDER IS: "${pin.visualStrategy.textOverlay}"
        
        SUBJECT: ${pin.visualStrategy.imagePrompt}
        
        MANDATORY RULES:
        1. Render the text exactly: "${pin.visualStrategy.textOverlay}"
        2. Text must be large, bold, high-contrast, and mobile-readable.
        3. Professional 2:3 Portrait ratio.
        4. Subject must be central but not obstructed by text.
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: finalPrompt }] },
        config: { imageConfig: { aspectRatio: "2:3" } }
      });
      
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) {
        const base64Url = `data:image/png;base64,${part.inlineData.data}`;
        setImageUrl(base64Url);
        performCloudSync(base64Url);
      } else {
        throw new Error("No image data returned from model.");
      }
    } catch (err: any) {
      setError(err.message || "Visual synthesis failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pin.visualStrategy, imageUrl, loading, performCloudSync]);

  useEffect(() => {
    if (!pin.generatedImageUrl) {
      generateImage();
    }
  }, [generateImage, pin.generatedImageUrl]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageUrl(null);
    generateImage();
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group overflow-hidden">
      <div 
        className="aspect-[2/3] w-full bg-gray-50 relative overflow-hidden cursor-zoom-in"
        onClick={() => imageUrl && onExpand(imageUrl)}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={pin.title} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
            {error ? (
              <>
                <ExclamationCircleIcon className="w-12 h-12 text-red-300 mb-4" />
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-relaxed mb-4">
                  {error.includes("quota") ? "API Quota Exceeded" : error}
                </p>
                <button 
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-500 text-white text-[9px] font-black uppercase rounded-lg shadow-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5" /> Retry Synthesis
                </button>
              </>
            ) : (
              <>
                <ArrowPathIcon className={`w-10 h-10 text-gray-200 ${loading ? 'animate-spin text-red-500' : ''}`} />
                <p className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                  {loading ? "Forging Visual Asset" : "Strategy Initialized"}
                </p>
              </>
            )}
          </div>
        )}
        
        {/* STATUS BADGES */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {uploading && (
            <div className="bg-blue-600/90 backdrop-blur-md text-white text-[8px] font-black px-3 py-1.5 rounded-lg uppercase flex items-center gap-2 shadow-xl animate-pulse">
              <CloudArrowUpIcon className="w-3 h-3" /> Syncing Public URL...
            </div>
          )}
          {pin.publicMediaUrl && !uploading && (
            <div className="bg-emerald-500/90 backdrop-blur-md text-white text-[8px] font-black px-3 py-1.5 rounded-lg uppercase flex items-center gap-2 shadow-xl">
              <ShieldCheckIcon className="w-3 h-3" /> CDN Delivery Ready
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-lg p-4 rounded-2xl border border-gray-100 shadow-2xl transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Overlay Target</p>
           <p className="text-xs font-black text-gray-900 leading-tight">"{pin.visualStrategy.textOverlay}"</p>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <StyleIcon type={pin.visualStrategy.styleType} className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pin.visualStrategy.styleType}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-300 uppercase">{pin.scheduledDate?.split(' ')[1]}</span>
        </div>
        
        <h4 className="text-lg font-black text-gray-900 leading-tight mb-3 line-clamp-2">{pin.title}</h4>
        <p className="text-xs text-gray-500 line-clamp-3 mb-6 leading-relaxed">{pin.description}</p>
        
        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-[70%]">
            <InboxStackIcon className="w-4 h-4 text-gray-300 shrink-0" />
            <span className="text-[10px] font-black text-gray-400 truncate uppercase tracking-widest">{pin.suggestedBoards[0]}</span>
          </div>
          {pin.publicMediaUrl && <CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
        </div>
      </div>
    </div>
  );
};

/**
 * ASSET PREVIEW MODAL
 */
const AssetPreviewModal: React.FC<{ 
  url: string; 
  onClose: () => void; 
  pin: PinVariation;
}> = ({ url, onClose, pin }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative max-w-7xl w-full flex flex-col md:flex-row gap-12 items-stretch max-h-[90vh]">
        <div className="flex-1 bg-gray-900 rounded-[3.5rem] overflow-hidden relative shadow-2xl flex items-center justify-center border border-white/10 group">
          <img src={url} className="max-h-full max-w-full object-contain" alt="Asset Preview" />
          <div className="absolute bottom-8 left-8 flex flex-col gap-3">
            <div className="bg-black/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 w-fit">
              <ScaleIcon className="w-5 h-5 text-red-500" /> 2:3 Pinterest Portrait
            </div>
            {pin.publicMediaUrl && (
              <div className="bg-emerald-600/90 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 w-fit shadow-3xl">
                <ShieldCheckIcon className="w-5 h-5" /> Public CDN Synced
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = url;
              link.download = `pinflow-${Date.now()}.png`;
              link.click();
            }}
            className="absolute bottom-8 right-8 bg-white hover:bg-gray-100 text-black px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-3xl flex items-center gap-3"
          >
            <ArrowDownTrayIcon className="w-5 h-5" /> Export Local
          </button>
        </div>

        <div className="w-full md:w-[450px] bg-white rounded-[3.5rem] p-12 flex flex-col overflow-y-auto scrollbar-hide shadow-3xl border border-gray-100">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-4xl font-black tracking-tighter leading-none">Studio Audit</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3">Visual Performance V5.2</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full"><XMarkIcon className="w-7 h-7 text-gray-400" /></button>
          </div>

          <div className="space-y-10 flex-1">
            <div className="p-8 bg-red-50 border border-red-100 rounded-[2rem]">
              <p className="text-2xl font-black text-red-600 leading-tight">"{pin.visualStrategy.textOverlay}"</p>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-3">High-Impact Render</p>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-4">Source Angle</h3>
              <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-8 rounded-[2rem] font-medium border border-gray-100">{pin.description}</p>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-4">Permanent Media Link</h3>
              <div className="bg-gray-900 text-emerald-400 p-5 rounded-2xl font-mono text-[9px] break-all border border-emerald-900/50">
                {pin.publicMediaUrl || "Awaiting final sync..."}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="mt-12 w-full py-8 bg-black text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] hover:bg-gray-800 transition-all shadow-black/20">
            Audit Approved
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    pinsPerDay: 3,
    startDate: new Date().toISOString().split('T')[0],
    variationsPerUrl: 3
  });
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    results: null
  });

  const [expandedAsset, setExpandedAsset] = useState<{url: string, pin: PinVariation} | null>(null);

  const handleProcess = async () => {
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u !== '');
    if (urls.length === 0) return;
    setState({ loading: true, error: null, results: null });
    try {
      const results = await generatePinterestCampaign(urls);
      const scheduledResults = scheduleCampaign(results, settings);
      setState({ loading: false, error: null, results: scheduledResults });
    } catch (err: any) {
      setState({ loading: false, error: err.message || "Engine failure.", results: null });
    }
  };

  /**
   * Deep Immutable State Update for Variation Sync
   */
  const handleSyncComplete = (urlIdx: number, varIdx: number, base64: string, publicUrl: string) => {
    setState(prev => {
      if (!prev.results) return prev;
      
      const newResults = prev.results.map((res, uIdx) => {
        if (uIdx !== urlIdx) return res;
        return {
          ...res,
          variations: res.variations.map((v, vIdx) => {
            if (vIdx !== varIdx) return v;
            return {
              ...v,
              generatedImageUrl: base64,
              publicMediaUrl: publicUrl
            };
          })
        };
      });

      return { ...prev, results: newResults };
    });
  };

  const timelineData = useMemo(() => {
    if (!state.results) return [];
    const flattened: any[] = [];
    state.results.forEach((urlRes, uIdx) => {
      urlRes.variations.forEach((v, vIdx) => flattened.push({ pin: v, sourceUrl: urlRes.sourceUrl, uIdx, vIdx }));
    });
    const groups: Record<string, any[]> = {};
    flattened.forEach(item => {
      const dateKey = item.pin.scheduledDate?.split(' ')[0] || 'Unscheduled';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return Object.keys(groups).sort().map(date => ({ 
      date, 
      pins: groups[date].sort((a, b) => (a.pin.scheduledDate || '').localeCompare(b.pin.scheduledDate || '')) 
    }));
  }, [state.results]);

  const totalPins = state.results ? state.results.length * 3 : 0;
  const cloudReadyCount = useMemo(() => {
    if (!state.results) return 0;
    return state.results.reduce((acc, r) => acc + r.variations.filter(v => v.publicMediaUrl).length, 0);
  }, [state.results]);

  const isAllSynced = totalPins > 0 && cloudReadyCount === totalPins;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans pb-60 selection:bg-red-100">
      {expandedAsset && <AssetPreviewModal url={expandedAsset.url} pin={expandedAsset.pin} onClose={() => setExpandedAsset(null)} />}

      <nav className="bg-white/95 border-b border-gray-100 sticky top-0 z-[60] backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-[#E60023] rounded-2xl flex items-center justify-center shadow-xl shadow-red-100 active:scale-95 transition-transform"><SparklesIcon className="w-7 h-7 text-white" /></div>
              <div>
                <span className="text-2xl font-black tracking-tighter block leading-none">PinFlow <span className="text-[#E60023]">PRO</span></span>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">High-Impact Visual Studio</span>
              </div>
            </div>
            
            {state.results && (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end mr-6 text-right">
                  <span className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isAllSynced ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {isAllSynced ? 'CDN Batch Ready' : `Syncing Assets: ${cloudReadyCount}/${totalPins}`}
                  </span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{timelineData.length} Day Horizon</span>
                </div>
                <button 
                  onClick={() => state.results && exportToPinterestCSV(state.results)}
                  disabled={!isAllSynced}
                  className={`px-10 py-4 border border-transparent text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all flex items-center gap-2 active:scale-95 ${isAllSynced ? 'bg-[#E60023] text-white hover:bg-[#ad001a] shadow-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  <DocumentArrowDownIcon className="w-5 h-5" /> Bulk Export
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          <div className="lg:col-span-4 space-y-12">
            <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-gray-200/50 border border-gray-100 sticky top-32">
              <h2 className="text-4xl font-black mb-3 tracking-tighter">Studio Control</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-12">Mandatory Cloud Delivery</p>
              
              <div className="space-y-10">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-5 ml-1">Destination URLs</label>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste URLs here (1 per line)..."
                    className="w-full h-56 px-8 py-6 bg-gray-50 border-0 ring-1 ring-gray-100 rounded-[2.5rem] text-xs font-mono shadow-inner resize-none focus:ring-4 focus:ring-red-500/10 transition-all"
                  />
                </div>
                <button 
                  onClick={handleProcess} 
                  disabled={state.loading} 
                  className={`w-full py-8 rounded-[3rem] font-black text-[13px] uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 ${state.loading ? 'bg-gray-100 text-gray-300' : 'bg-black text-white hover:bg-gray-800 shadow-black/20'}`}
                >
                  {state.loading ? <ArrowPathIcon className="w-8 h-8 animate-spin" /> : <RocketLaunchIcon className="w-8 h-8" />}
                  {state.loading ? 'Synchronizing' : 'Start Synthesis'}
                </button>
                
                <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 space-y-6">
                  <div className="flex items-center gap-4"><ShieldCheckIcon className="w-6 h-6 text-red-600" /><span className="text-[11px] font-black text-red-600 uppercase tracking-widest">Logic Guard</span></div>
                  <div className="space-y-4">
                    {['Deep Immutable Sync', 'Mandatory 2:3 Portraits', 'Strict 3-Pin Batching'].map((rule, i) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-bold text-red-400 uppercase tracking-tighter"><div className="w-1.5 h-1.5 bg-red-300 rounded-full" /> {rule}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-20">
            {!state.results && !state.loading && (
              <div className="h-full min-h-[800px] flex flex-col items-center justify-center text-center p-24 bg-white rounded-[5rem] border-2 border-dashed border-gray-100 shadow-sm relative group overflow-hidden transition-all hover:border-red-100">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#E60023]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mb-12 shadow-inner"><InboxIcon className="w-20 h-20 text-gray-200" /></div>
                <h3 className="text-5xl font-black text-gray-200 uppercase tracking-[0.6em] mb-10 text-center">Studio Offline</h3>
                <p className="text-gray-400 max-w-sm text-2xl font-black tracking-tighter leading-tight italic">Ready to synthesize high-impact visual strategies for Pinterest Authority.</p>
              </div>
            )}

            {state.loading && (
              <div className="bg-white rounded-[5rem] p-24 text-center animate-pulse py-80 border border-gray-100">
                <ArrowPathIcon className="w-20 h-20 text-[#E60023] animate-spin mx-auto mb-12" />
                <h3 className="text-5xl font-black text-gray-200 uppercase tracking-[0.4em]">Batch Synthesis</h3>
                <p className="text-gray-400 font-black text-2xl tracking-tighter italic mt-6">Generating variations and scheduling sequence...</p>
              </div>
            )}

            {state.results && (
              <div className="space-y-32 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                {timelineData.map((day, dIdx) => (
                  <div key={dIdx} className="space-y-16 relative">
                    <div className="sticky top-[100px] z-50 py-6 pointer-events-none">
                      <div className="bg-white/95 backdrop-blur-xl px-12 py-6 rounded-[2.5rem] border border-gray-100 shadow-2xl inline-flex items-center gap-10 pointer-events-auto">
                        <div className="w-16 h-16 bg-black rounded-[1.5rem] flex flex-col items-center justify-center shadow-xl">
                          <span className="text-white text-[10px] font-black uppercase mb-1">Day</span>
                          <span className="text-white text-3xl font-black leading-none">{dIdx + 1}</span>
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{day.date}</h3>
                          <p className="text-[11px] font-black text-emerald-500 uppercase mt-2 tracking-widest">Variation Engine Verified</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                      {day.pins.map((item: any, pIdx: number) => (
                        <PinStudioCard 
                          key={pIdx}
                          pin={item.pin}
                          sourceUrl={item.sourceUrl}
                          onExpand={(url) => setExpandedAsset({ url, pin: item.pin })}
                          onSyncComplete={(base64, publicUrl) => handleSyncComplete(item.uIdx, item.vIdx, base64, publicUrl)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-32 opacity-20 border-t border-gray-100 mx-auto max-w-7xl px-12 mt-60">
         <p className="text-[14px] font-black uppercase tracking-[1.5em] text-gray-400 mb-8">Studio Step 24 Protocol • Visual Authority Engine</p>
         <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">PinFlow PRO V5.2.1 • Robust Delivery Engine</p>
      </footer>
    </div>
  );
};

export default App;
