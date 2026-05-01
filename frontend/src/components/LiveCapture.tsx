import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Radio, Cpu, Save, AlertTriangle, ChevronDown, 
  Square, CheckCircle2, XCircle, Download, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  checkNpcap, getInterfaces, startCapture, stopCapture
} from '../services/captureService';
import type { NetworkInterface } from '../services/captureService';
import { downloadResult } from '../services/uploadService';

interface LiveCaptureProps {
  socket: Socket;
  onPageChange: (page: 'dashboard' | 'upload' | 'generate' | 'live' | 'rules' | 'logs') => void;
  isCapturing: boolean;
  setIsCapturing: (capturing: boolean) => void;
}

type CaptureState = 'idle' | 'checking' | 'ready' | 'npcap-missing' | 'capturing' | 'complete' | 'error';

export default function LiveCapture({ socket, isCapturing, setIsCapturing }: LiveCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle');
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [fetchingInterfaces, setFetchingInterfaces] = useState(false);
  
  // Configuration
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [duration, setDuration] = useState<30 | 60 | 300>(30);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [bpfFilter, setBpfFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Live State
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('activeCaptureSessionId') || null);
  const [liveStats, setLiveStats] = useState({ packets: 0, bytes: 0, elapsed: 0, pps: 0 });
  const [chartData, setChartData] = useState<{ elapsed: number; pps: number }[]>([]);
  
  // Result State
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStage, setJobStage] = useState('');
  const [resultStats, setResultStats] = useState<{ forwarded: number; dropped: number; total: number } | null>(null);
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const jobIdRef = useRef<string | null>(null);

  // ── Initialization ──────────────────────────────────────────────────────────
  
  const loadInterfaces = useCallback(async () => {
    setFetchingInterfaces(true);
    try {
      const ifaces = await getInterfaces();
      setInterfaces(ifaces);
      if (ifaces.length > 0) {
        setSelectedInterface(prev => prev || ifaces[0].id);
      }
    } catch {
      toast.error('Failed to load network interfaces');
    } finally {
      setFetchingInterfaces(false);
    }
  }, []);

  const checkPrerequisites = useCallback(async () => {
    setState('checking');
    try {
      const npcap = await checkNpcap();
      if (!npcap.installed) {
        setState('npcap-missing');
        return;
      }
      
      await loadInterfaces();
      
      // Resume logic if we reconnected
      if (sessionId) {
        setState('capturing');
        setIsCapturing(true);
      } else {
        setState('ready');
      }
    } catch (err: unknown) {
      toast.error('Failed to check prerequisites');
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId, setIsCapturing, loadInterfaces]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // We don't want checkPrerequisites to be called synchronously
      // to avoid React warning about setState in effect during render
      setTimeout(() => {
        checkPrerequisites();
      }, 0);
    }
  }, [checkPrerequisites]);

  // ── Socket Integration ────────────────────────────────────────────────────
  
  useEffect(() => {
    const onCaptureStats = (data: { sessionId: string; packets: number; bytes: number; elapsed: number; pps: number }) => {
      if (data.sessionId !== sessionId) return;
      setIsCapturing(true);
      if (state !== 'capturing') setState('capturing');
      setLiveStats({ packets: data.packets, bytes: data.bytes, elapsed: data.elapsed, pps: data.pps });
      setChartData(prev => {
        const newData = [...prev, { elapsed: data.elapsed, pps: data.pps }];
        if (newData.length > 60) newData.shift();
        return newData;
      });
    };

    const onCaptureComplete = (data: { sessionId: string; autoAnalyze: boolean; jobId?: string; downloadPath?: string }) => {
      if (data.sessionId !== sessionId) return;
      setIsCapturing(false);
      localStorage.removeItem('activeCaptureSessionId');
      setSessionId(null);
      setState('complete');
      if (!data.autoAnalyze) {
        setDownloadPath(data.downloadPath || null);
        toast.success('Capture complete');
      } else {
        if (data.jobId) jobIdRef.current = data.jobId;
        setJobStage('Initializing analysis...');
      }
    };

    const onCaptureError = (data: { sessionId: string; message: string }) => {
      if (data.sessionId !== sessionId) return;
      setIsCapturing(false);
      localStorage.removeItem('activeCaptureSessionId');
      setSessionId(null);
      setState('error');
      setErrorMessage(data.message);
      toast.error('Capture failed');
    };

    const onJobProgress = (data: { jobId: string; progress: number; stage: string }) => {
      if (jobIdRef.current === data.jobId) {
        setJobProgress(data.progress);
        setJobStage(data.stage);
      }
    };

    const onJobDone = (data: { jobId: string; stats: { metrics: { forwarded: number; dropped: number; totalPackets: number } }; outputFile: string }) => {
      if (jobIdRef.current === data.jobId) {
        setJobProgress(100);
        setJobStage('Analysis Complete');
        setDownloadPath(data.outputFile);
        setResultStats({
          forwarded: data.stats.metrics.forwarded,
          dropped: data.stats.metrics.dropped,
          total: data.stats.metrics.totalPackets,
        });
        toast.success('Analysis complete');
      }
    };

    socket.on('capture:stats', onCaptureStats);
    socket.on('capture:complete', onCaptureComplete);
    socket.on('capture:error', onCaptureError);
    socket.on('job:progress', onJobProgress);
    socket.on('job:done', onJobDone);

    return () => {
      socket.off('capture:stats', onCaptureStats);
      socket.off('capture:complete', onCaptureComplete);
      socket.off('capture:error', onCaptureError);
      socket.off('job:progress', onJobProgress);
      socket.off('job:done', onJobDone);
    };
  }, [socket, sessionId, state, setIsCapturing]);

  // ── Actions ───────────────────────────────────────────────────────────────
  
  const handleStartCapture = async () => {
    if (!selectedInterface) return;
    
    setLiveStats({ packets: 0, bytes: 0, elapsed: 0, pps: 0 });
    setChartData([]);
    setJobProgress(0);
    setJobStage('');
    setResultStats(null);
    setDownloadPath(null);
    setErrorMessage('');
    jobIdRef.current = null;

    setState('capturing');
    try {
      const res = await startCapture({
        interface: selectedInterface,
        duration,
        filter: bpfFilter,
        autoAnalyze
      });
      setSessionId(res.sessionId);
      localStorage.setItem('activeCaptureSessionId', res.sessionId);
      setIsCapturing(true);
    } catch (err: unknown) {
      setState('error');
      setIsCapturing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start capture');
      toast.error('Failed to start capture');
    }
  };

  const handleStopCapture = async () => {
    if (!sessionId) return;
    try {
      await stopCapture(sessionId);
    } catch (err: unknown) {
      toast.error('Failed to stop capture: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const resetState = () => {
    setState('ready');
    setLiveStats({ packets: 0, bytes: 0, elapsed: 0, pps: 0 });
    setChartData([]);
  };

  // ── Formatting ────────────────────────────────────────────────────────────

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const remainingSeconds = Math.max(0, duration - liveStats.elapsed);
  const formattedTime = `00:${remainingSeconds.toString().padStart(2, '0')}`;

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === 'checking') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 text-primary border-4 border-current border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Title */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-4xl font-bold font-display text-on-surface flex items-center justify-center gap-3">
          <Radio className={cn("w-8 h-8", isCapturing ? "text-error animate-pulse" : "text-primary")} />
          Live Capture
        </h2>
        <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
          Capture network traffic directly from your machine using npcap.
        </p>
      </div>

      {/* CARD 1 — Configuration */}
      {(state === 'idle' || state === 'ready' || state === 'npcap-missing' || state === 'error') && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-lg p-6 lg:p-8 space-y-8">
          
          {state === 'npcap-missing' && (
            <div className="bg-[#FFF4E5] border border-[#FF991F] p-5 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 bg-[#FF991F] rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-[#172B4D] text-lg">npcap Not Installed</h3>
                <p className="text-sm text-[#42526E]">
                  Live capture requires npcap to be installed on your Windows machine.
                </p>
                <div className="text-sm text-[#42526E] bg-white p-3 rounded-lg border border-[#FF991F]/30">
                  <p className="font-bold mb-2">Installation Guide:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Visit <a href="https://npcap.com/#download" target="_blank" rel="noreferrer" className="text-primary hover:underline">npcap.com/#download</a></li>
                    <li>Download the latest installer</li>
                    <li>Run as Administrator</li>
                    <li>Restart this application</li>
                  </ol>
                </div>
                <div className="flex gap-3 pt-2">
                  <a 
                    href="https://npcap.com/#download" 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-4 py-2 bg-primary text-white rounded font-bold hover:bg-primary-container transition-colors text-sm"
                  >
                    Download npcap
                  </a>
                  <button 
                    onClick={checkPrerequisites}
                    className="px-4 py-2 border border-outline-variant text-on-surface rounded font-bold hover:bg-surface-container transition-colors text-sm flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="bg-error-container text-error p-4 rounded-xl flex items-center gap-3">
              <XCircle className="w-5 h-5" />
              <p className="font-bold text-sm flex-1">{errorMessage}</p>
              <button onClick={resetState} className="text-xs underline font-bold">Dismiss</button>
            </div>
          )}

          <div className={cn("space-y-8", state === 'npcap-missing' ? "opacity-50 pointer-events-none" : "")}>
            
            {/* Interface Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-on-surface">Network Interface</label>
                <button onClick={loadInterfaces} className="text-primary hover:text-primary-container p-1" disabled={fetchingInterfaces}>
                  <RefreshCw className={cn("w-4 h-4", fetchingInterfaces ? "animate-spin" : "")} />
                </button>
              </div>
              <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                disabled={fetchingInterfaces}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 outline-none text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {interfaces.length === 0 && <option value="">No interfaces found</option>}
                {interfaces.map(iface => (
                  <option key={iface.id} value={iface.id}>
                    {iface.name} {iface.ipAddress ? `(${iface.ipAddress})` : ''} {!iface.isUp ? '[DOWN]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-on-surface">Duration</label>
              <div className="grid grid-cols-3 gap-3">
                {[30, 60, 300].map((val) => (
                  <button
                    key={val}
                    onClick={() => setDuration(val as 30 | 60 | 300)}
                    className={cn(
                      "py-3 rounded-xl font-bold text-sm transition-all border",
                      duration === val 
                        ? "bg-primary text-white border-primary shadow-md" 
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container hover:text-on-surface"
                    )}
                  >
                    {val === 30 ? '30s' : val === 60 ? '1 min' : '5 min'}
                  </button>
                ))}
              </div>
            </div>

            {/* Post-Capture Action */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-on-surface">Post-Capture Action</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setAutoAnalyze(true)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                    autoAnalyze ? "border-primary bg-primary-fixed/10" : "border-outline-variant hover:border-outline"
                  )}
                >
                  <Cpu className={cn("w-6 h-6 mb-2", autoAnalyze ? "text-primary" : "text-outline")} />
                  <span className={cn("font-bold text-sm", autoAnalyze ? "text-primary" : "text-on-surface")}>Auto-Analyze</span>
                  <span className="text-xs text-on-surface-variant mt-1">Capture then immediately run through DPI engine</span>
                </button>
                <button
                  onClick={() => setAutoAnalyze(false)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                    !autoAnalyze ? "border-primary bg-primary-fixed/10" : "border-outline-variant hover:border-outline"
                  )}
                >
                  <Save className={cn("w-6 h-6 mb-2", !autoAnalyze ? "text-primary" : "text-outline")} />
                  <span className={cn("font-bold text-sm", !autoAnalyze ? "text-primary" : "text-on-surface")}>Save Only</span>
                  <span className="text-xs text-on-surface-variant mt-1">Save PCAP file without analysis</span>
                </button>
              </div>
            </div>

            {/* BPF Filter */}
            <div className="border border-outline-variant rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors"
              >
                <span className="text-sm font-bold text-on-surface">Advanced Filters</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced ? "rotate-180" : "")} />
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: 'auto' }} 
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-outline-variant bg-white space-y-2">
                      <input
                        type="text"
                        value={bpfFilter}
                        onChange={(e) => setBpfFilter(e.target.value)}
                        placeholder="e.g. tcp port 443"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 outline-none text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-xs text-on-surface-variant">Uses Berkeley Packet Filter syntax</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleStartCapture}
              disabled={!selectedInterface}
              className="w-full py-4 bg-error text-white rounded-xl font-bold hover:bg-error-container hover:text-error transition-all shadow-md flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              Start Live Capture
            </button>
          </div>
        </div>
      )}

      {/* CARD 2 — Live Status */}
      {state === 'capturing' && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-lg overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
              </span>
              <span className="font-bold tracking-widest text-error">CAPTURING LIVE</span>
            </div>
            <motion.div 
              key={formattedTime}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-mono font-bold text-on-surface"
            >
              {formattedTime}
            </motion.div>
          </div>
          
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Packets</p>
              <p className="text-2xl font-bold text-primary font-mono">{liveStats.packets}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Bytes</p>
              <p className="text-2xl font-bold text-on-surface font-mono">{formatBytes(liveStats.bytes)}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Elapsed</p>
              <p className="text-2xl font-bold text-on-surface font-mono">{liveStats.elapsed}s</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Packets/Sec</p>
              <p className="text-2xl font-bold text-[#006644] font-mono">{liveStats.pps}</p>
            </div>
          </div>

          <div className="h-48 w-full bg-surface-container-lowest border-t border-outline-variant p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0052CC" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0052CC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="elapsed" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#091E42', color: 'white', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#4C9AFF' }}
                  labelFormatter={(v) => `Sec ${v}`}
                />
                <Area type="monotone" dataKey="pps" stroke="#0052CC" strokeWidth={2} fillOpacity={1} fill="url(#colorPps)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 bg-surface-container-lowest border-t border-outline-variant">
            <button
              onClick={handleStopCapture}
              className="w-full py-3 border-2 border-error text-error rounded-xl font-bold hover:bg-error-container transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Capture
            </button>
          </div>
        </div>
      )}

      {/* CARD 3 — Results */}
      {state === 'complete' && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-lg p-6 lg:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="w-16 h-16 bg-[#E3FCEF] rounded-full flex items-center justify-center text-[#006644]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-display text-on-surface">Capture Complete</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 border-b border-outline-variant pb-6">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Packets</p>
              <p className="text-xl font-bold text-on-surface font-mono">{liveStats.packets}</p>
            </div>
            <div className="text-center border-l border-r border-outline-variant">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Data Size</p>
              <p className="text-xl font-bold text-on-surface font-mono">{formatBytes(liveStats.bytes)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration</p>
              <p className="text-xl font-bold text-on-surface font-mono">{liveStats.elapsed}s</p>
            </div>
          </div>

          {autoAnalyze ? (
            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-on-surface">{jobStage || 'Analyzing captured traffic...'}</span>
                  <span className="text-xl font-bold font-display text-primary">{jobProgress}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${jobProgress}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />
                </div>
              </div>

              {resultStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#E3FCEF]/50 border border-[#E3FCEF] p-4 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Forwarded</p>
                    <p className="text-2xl font-bold text-[#006644]">{resultStats.forwarded}</p>
                  </div>
                  <div className="bg-[#FFEBE6]/50 border border-[#FFEBE6] p-4 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Dropped</p>
                    <p className="text-2xl font-bold text-[#DE350B]">{resultStats.dropped}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm font-bold text-on-surface-variant py-4">
              File saved successfully. Auto-analyze was skipped.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {downloadPath && (
              <button
                onClick={() => downloadResult(downloadPath)}
                className="flex-1 py-3 bg-primary hover:bg-primary-container text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PCAP
              </button>
            )}
            <button
              onClick={resetState}
              className={cn(
                "py-3 font-bold rounded-xl transition-all",
                downloadPath 
                  ? "flex-1 bg-surface-container-high hover:bg-outline-variant text-on-surface" 
                  : "w-full bg-primary hover:bg-primary-container text-white"
              )}
            >
              Capture Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
