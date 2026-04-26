import React, { useState } from 'react';
import { CloudUpload, FileText, X, CheckCircle2, Download, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function Upload() {
  const [files, setFiles] = useState([
    { id: '1', name: 'capture_eth0_1024.pcap', size: '142.5 MB', progress: 68, status: 'uploading' },
    { id: '2', name: 'edge_router_trace_01.pcap', size: '89.2 MB', progress: 100, status: 'completed' }
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold font-display text-on-surface">Upload PCAP</h2>
        <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto font-body-md">
          Upload a network capture file (.pcap, .pcapng) for deep packet inspection and automated rule processing.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-lg overflow-hidden">
        <div className="p-8 space-y-8">
          <label className="group relative border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low/50 hover:bg-surface-container flex flex-col items-center justify-center py-20 px-8 transition-all cursor-pointer">
            <input type="file" className="sr-only" />
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <CloudUpload className="w-8 h-8 text-primary-container" />
            </div>
            <p className="text-xl font-bold text-on-surface mb-2 font-display">Click or drag PCAP file here</p>
            <p className="text-sm text-on-surface-variant text-center max-w-md font-body-md">
              Supported formats: .pcap, .pcapng, .cap. Maximum file size: 500MB.
            </p>
            <div className="mt-8 flex items-center gap-4 w-full max-w-xs">
              <div className="h-px bg-outline-variant flex-1" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline">or</span>
              <div className="h-px bg-outline-variant flex-1" />
            </div>
            <button className="mt-6 px-8 py-2.5 bg-white border border-outline-variant rounded font-semibold text-on-surface hover:bg-surface-container-high transition-colors shadow-sm">
              Browse Files
            </button>
          </label>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Active Queue</h3>
            <AnimatePresence>
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg flex flex-col gap-3 group relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded flex items-center justify-center",
                        file.status === 'completed' ? "bg-secondary-container text-primary" : "bg-primary-fixed text-primary-container"
                      )}>
                        {file.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{file.name}</p>
                        <p className="text-xs text-on-surface-variant font-body-md">
                          {file.size} • {file.status === 'completed' ? 'Processing Ready' : 'Uploading...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-primary tabular-nums">{file.progress}%</span>
                      <button 
                        onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))}
                        className="p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-primary h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                    />
                  </div>
                  {file.status === 'completed' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 pt-1"
                    >
                      <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 bg-primary-fixed/30 px-3 py-1 rounded">
                        <Download className="w-3.5 h-3.5" />
                        Download Analysis
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-surface-container-low px-8 py-5 border-t border-outline-variant flex items-center justify-between">
          <button className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary-fixed/50 rounded transition-colors flex items-center gap-2 group">
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            Download Sample Reference
          </button>
          <button 
            disabled={!files.some(f => f.status === 'completed')}
            className="px-8 py-2.5 bg-primary text-white rounded font-bold hover:bg-primary-container transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            <Cpu className="w-4 h-4 text-on-primary/70" />
            Process Files
          </button>
        </div>
      </div>

      <div className="bg-secondary-fixed/30 p-5 rounded-xl border border-outline-variant flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-secondary" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-on-surface text-sm">Security & Privacy Protocol</p>
          <p className="text-sm text-on-surface-variant font-body-md leading-relaxed">
            All uploaded PCAP files are processed in secure volatile memory. Files are automatically purged from the system after analysis is complete. Our DPI Engine does not persist any raw network traffic data in persistent storage.
          </p>
        </div>
      </div>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
