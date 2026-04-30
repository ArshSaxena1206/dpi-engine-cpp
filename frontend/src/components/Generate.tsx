import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Play, Globe, Lock, Server, Zap, Cpu, CheckCircle2, XCircle, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { generatePcap } from '../services/generateService';
import { downloadResult } from '../services/uploadService';

interface GenerateProps {
  socket: Socket;
  onPageChange: (page: 'dashboard' | 'upload' | 'generate' | 'rules' | 'logs') => void;
}

type GenerateState = 'idle' | 'generating' | 'complete' | 'error';

interface FormValues {
  packetCount: number;
  protocols: string[];
  domains: string[];
  ipRange: string;
}

const PROTOCOL_OPTIONS = [
  { id: 'http', label: 'HTTP', icon: Globe, desc: 'Unencrypted web traffic' },
  { id: 'https', label: 'HTTPS', icon: Lock, desc: 'TLS encrypted web traffic' },
  { id: 'dns', label: 'DNS', icon: Server, desc: 'Domain name resolution' },
  { id: 'quic', label: 'QUIC', icon: Zap, desc: 'UDP-based modern protocol' },
];

export default function Generate({ socket, onPageChange }: GenerateProps) {
  const [state, setState] = useState<GenerateState>('idle');
  
  // Form State
  const [formValues, setFormValues] = useState<FormValues>({
    packetCount: 500,
    protocols: ['http', 'https', 'dns'],
    domains: ['youtube.com', 'google.com', 'github.com'],
    ipRange: '192.168.1.0/24'
  });
  
  const [domainInput, setDomainInput] = useState('');
  const [ipRangeError, setIpRangeError] = useState('');
  
  // Job State
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultStats, setResultStats] = useState<{ forwarded: number; dropped: number; total: number } | null>(null);
  const [outputFile, setOutputFile] = useState<string | null>(null);

  // ── Socket Integration ─────────────────────────────────────────────
  useEffect(() => {
    const onProgress = (data: { jobId: string; progress: number; stage: string }) => {
      // Allow updates for either the genJobId or the real Bull jobId
      setProgress(data.progress);
      setStage(data.stage);
    };

    const onDone = (data: { jobId: string; stats: any; outputFile: string }) => {
      setProgress(100);
      setStage('Complete');
      setOutputFile(data.outputFile);
      setResultStats({
        forwarded: data.stats.metrics.forwarded,
        dropped: data.stats.metrics.dropped,
        total: data.stats.metrics.totalPackets,
      });
      setState('complete');
      toast.success('PCAP Generation & Analysis Complete');
    };

    const onDisconnect = () => {
      if (state === 'generating') {
        toast.error('WebSocket disconnected during generation');
      }
    };

    socket.on('job:progress', onProgress);
    socket.on('job:done', onDone);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('job:progress', onProgress);
      socket.off('job:done', onDone);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, state]);

  // ── Form Handlers ──────────────────────────────────────────────────
  const toggleProtocol = (id: string) => {
    setFormValues(prev => {
      const isSelected = prev.protocols.includes(id);
      const newProtocols = isSelected
        ? prev.protocols.filter(p => p !== id)
        : [...prev.protocols, id];
      return { ...prev, protocols: newProtocols };
    });
  };

  const handleDomainKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = domainInput.trim().replace(/,/g, '');
      if (value && !formValues.domains.includes(value)) {
        setFormValues(prev => ({ ...prev, domains: [...prev.domains, value] }));
      }
      setDomainInput('');
    }
  };

  const removeDomain = (domainToRemove: string) => {
    setFormValues(prev => ({
      ...prev,
      domains: prev.domains.filter(d => d !== domainToRemove)
    }));
  };

  const validateIpRange = () => {
    const regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!regex.test(formValues.ipRange)) {
      setIpRangeError('Invalid CIDR format (e.g., 192.168.1.0/24)');
      return false;
    }
    setIpRangeError('');
    return true;
  };

  const handleGenerate = async () => {
    if (formValues.protocols.length === 0) {
      toast.error('Select at least one protocol');
      return;
    }
    if (!validateIpRange()) return;

    setState('generating');
    setProgress(0);
    setStage('Initializing generator...');
    setErrorMessage('');
    
    try {
      const res = await generatePcap({
        packetCount: formValues.packetCount,
        protocols: formValues.protocols,
        domains: formValues.domains,
        ipRange: formValues.ipRange
      });
      setJobId(res.jobId);
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'Failed to generate PCAP');
      toast.error('Generation request failed');
    }
  };

  const resetForm = () => {
    setState('idle');
    setJobId(null);
    setProgress(0);
    setStage('');
    setResultStats(null);
    setOutputFile(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold font-display text-on-surface">Synthetic PCAP Generator</h2>
        <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
          Configure parameters to generate realistic synthetic network traffic for testing DPI rules and system performance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN — Configuration Form */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-lg p-6 lg:p-8 space-y-8">
          
          {/* Packet Count */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Packet Count</label>
              <div className="bg-primary-fixed text-primary-container px-3 py-1 rounded-full text-xs font-bold tabular-nums">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={formValues.packetCount}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    className="inline-block"
                  >
                    {formValues.packetCount}
                  </motion.span>
                </AnimatePresence> packets
              </div>
            </div>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={formValues.packetCount}
              onChange={(e) => setFormValues(prev => ({ ...prev, packetCount: parseInt(e.target.value) }))}
              className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-outline uppercase tracking-wider px-1">
              <span>100</span>
              <span>2500</span>
              <span>5000</span>
              <span>7500</span>
              <span>10000</span>
            </div>
          </div>

          {/* Protocols */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Protocols</label>
              {formValues.protocols.length === 0 && (
                <span className="text-xs text-error font-semibold">Select at least one protocol</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROTOCOL_OPTIONS.map((opt) => {
                const isSelected = formValues.protocols.includes(opt.id);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleProtocol(opt.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                      isSelected 
                        ? "border-primary bg-primary-fixed/20 shadow-sm" 
                        : "border-outline-variant hover:bg-surface-container hover:border-outline"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                      isSelected ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={cn("font-bold text-sm", isSelected ? "text-primary" : "text-on-surface")}>{opt.label}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Domains */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-on-surface block">Target Domains</label>
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-shadow">
              <div className="flex flex-wrap gap-2 mb-2">
                <AnimatePresence>
                  {formValues.domains.map((domain) => (
                    <motion.div
                      key={domain}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-secondary-container text-secondary flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold"
                    >
                      {domain}
                      <button onClick={() => removeDomain(domain)} className="hover:text-error transition-colors p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={handleDomainKeyDown}
                placeholder="Type domain and press Enter"
                className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline p-1"
              />
            </div>
          </div>

          {/* IP Range */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-on-surface block">IP Range (CIDR)</label>
              {ipRangeError && <span className="text-xs text-error font-semibold">{ipRangeError}</span>}
            </div>
            <input
              type="text"
              value={formValues.ipRange}
              onChange={(e) => setFormValues(prev => ({ ...prev, ipRange: e.target.value }))}
              onBlur={validateIpRange}
              placeholder="192.168.1.0/24"
              className={cn(
                "w-full bg-surface-container-lowest border rounded-xl p-3 outline-none text-sm text-on-surface transition-shadow",
                ipRangeError ? "border-error focus:ring-1 focus:ring-error" : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary"
              )}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={state === 'generating' || formValues.protocols.length === 0}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-container transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'generating' ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" fill="currentColor" />
                Generate & Analyze
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN — Status Panel */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* IDLE STATE */}
            {state === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4"
              >
                <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center mb-2">
                  <Cpu className="w-12 h-12 text-outline/50" />
                </div>
                <h3 className="text-xl font-bold font-display text-on-surface">Ready to Generate</h3>
                <p className="text-sm text-on-surface-variant max-w-sm">
                  Configure your parameters and click Generate to create a synthetic PCAP file for analysis
                </p>
              </motion.div>
            )}

            {/* GENERATING STATE */}
            {state === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 space-y-8"
              >
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-on-surface">{stage || 'Initializing...'}</span>
                    <span className="text-2xl font-bold font-display text-primary">{progress}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                    />
                  </div>
                </div>
                
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Packets Processed</p>
                  <motion.p className="text-3xl font-bold font-display text-on-surface tabular-nums">
                    {Math.floor((progress / 100) * formValues.packetCount)}
                  </motion.p>
                </div>
              </motion.div>
            )}

            {/* COMPLETE STATE */}
            {state === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col p-8"
              >
                <div className="flex flex-col items-center text-center space-y-3 mb-8">
                  <div className="w-16 h-16 bg-[#E3FCEF] rounded-full flex items-center justify-center text-[#006644]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold font-display text-on-surface">Generation Complete</h3>
                </div>

                {resultStats && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-surface-container p-4 rounded-xl text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Packets Generated</p>
                      <p className="text-xl font-bold text-on-surface">{resultStats.total}</p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-xl text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">File Size</p>
                      <p className="text-xl font-bold text-on-surface">~{(resultStats.total * 0.15).toFixed(1)} KB</p>
                    </div>
                    <div className="bg-[#E3FCEF]/50 border border-[#E3FCEF] p-4 rounded-xl text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Forwarded</p>
                      <p className="text-xl font-bold text-[#006644]">{resultStats.forwarded}</p>
                    </div>
                    <div className="bg-[#FFEBE6]/50 border border-[#FFEBE6] p-4 rounded-xl text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Dropped</p>
                      <p className="text-xl font-bold text-[#DE350B]">{resultStats.dropped}</p>
                    </div>
                  </div>
                )}

                <div className="mt-auto space-y-3">
                  {outputFile && (
                    <button
                      onClick={() => downloadResult(outputFile)}
                      className="w-full py-3 bg-surface-container-high hover:bg-outline-variant text-on-surface rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PCAP File
                    </button>
                  )}
                  <button
                    onClick={resetForm}
                    className="w-full py-3 bg-transparent text-primary hover:bg-primary-fixed/30 rounded-xl font-bold transition-all"
                  >
                    Generate Another
                  </button>
                </div>
              </motion.div>
            )}

            {/* ERROR STATE */}
            {state === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-error-container rounded-full flex items-center justify-center text-error">
                  <XCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-on-surface mb-2">Generation Failed</h3>
                  <p className="text-sm text-error font-semibold bg-error-container/50 p-3 rounded-lg inline-block">
                    {errorMessage}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-surface-container-high hover:bg-outline-variant text-on-surface rounded-lg font-bold transition-all"
                >
                  Try Again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
