import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloudUpload, FileText, X, CheckCircle2, Download, Cpu, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';

interface UploadProps {
  socket: Socket;
}

type FileEntry = {
  id: string;
  name: string;
  size: string;
  progress: number;
  stage: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  outputFile?: string;
  jobId?: number | string;
  resultStats?: { forwarded: number; dropped: number; total: number };
};

export default function Upload({ socket }: UploadProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Socket listeners for job progress / done ─────────────────
  useEffect(() => {
    const onProgress = (data: { jobId: number | string; progress: number; stage: string }) => {
      setFiles(prev => prev.map(f =>
        f.jobId !== undefined && String(f.jobId) === String(data.jobId)
          ? { ...f, progress: data.progress, stage: data.stage, status: data.stage === 'Failed' ? 'error' : 'processing' }
          : f
      ));
    };

    const onDone = (data: { jobId: number | string; stats: { metrics: { forwarded: number; dropped: number; totalPackets: number } }; outputFile: string }) => {
      setFiles(prev => prev.map(f =>
        f.jobId !== undefined && String(f.jobId) === String(data.jobId)
          ? {
              ...f,
              progress: 100,
              stage: 'Complete',
              status: 'completed',
              outputFile: data.outputFile,
              resultStats: {
                forwarded: data.stats.metrics.forwarded,
                dropped: data.stats.metrics.dropped,
                total: data.stats.metrics.totalPackets,
              },
            }
          : f
      ));
      toast.success(`Processing complete — ${data.stats.metrics.totalPackets} packets analyzed`);
    };

    socket.on('job:progress', onProgress);
    socket.on('job:done', onDone);
    return () => {
      socket.off('job:progress', onProgress);
      socket.off('job:done', onDone);
    };
  }, [socket]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
    e.target.value = '';
  };

  const processFile = useCallback(async (file: File) => {
    const entry: FileEntry = {
      id: Date.now().toString(),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      progress: 0,
      stage: 'Uploading…',
      status: 'uploading',
    };

    setFiles(prev => [entry, ...prev]);

    try {
      const formData = new FormData();
      formData.append('pcapFile', file);

      const res = await fetch('http://localhost:3001/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const jobId = data.data?.jobId;
        setFiles(prev => prev.map(f =>
          f.id === entry.id
            ? { ...f, jobId, progress: 5, stage: 'Queued — waiting for engine…', status: 'processing' }
            : f
        ));
      } else {
        const errData = await res.json().catch(() => null);
        const msg = errData?.error?.message ?? 'Upload failed';
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, progress: 100, stage: msg, status: 'error' } : f
        ));
        toast.error(msg);
      }
    } catch {
      setFiles(prev => prev.map(f =>
        f.id === entry.id ? { ...f, progress: 100, stage: 'Network error', status: 'error' } : f
      ));
      toast.error('Failed to connect to backend');
    }
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const hasCompleted = files.some(f => f.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold font-display text-on-surface">Upload PCAP</h2>
        <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
          Upload a network capture file (.pcap) for deep packet inspection and automated rule processing.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-lg overflow-hidden">
        <div className="p-8 space-y-8">
          <label
            className={cn(
              "group relative border-2 border-dashed rounded-xl bg-surface-container-low/50 flex flex-col items-center justify-center py-20 px-8 transition-all cursor-pointer",
              isDragging ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:bg-surface-container"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              className="sr-only"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pcap,.pcapng"
            />
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <CloudUpload className="w-8 h-8 text-primary-container" />
            </div>
            <p className="text-xl font-bold text-on-surface mb-2 font-display">
              {isDragging ? 'Drop it!' : 'Click or drag PCAP file here'}
            </p>
            <p className="text-sm text-on-surface-variant text-center max-w-md">
              Supported formats: .pcap, .pcapng. Maximum file size: 100MB.
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

          {files.length > 0 && (
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
                          file.status === 'completed' ? "bg-secondary-container text-primary" :
                          file.status === 'error' ? "bg-error-container text-error" :
                          "bg-primary-fixed text-primary-container"
                        )}>
                          {file.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                           file.status === 'error' ? <AlertTriangle className="w-5 h-5" /> :
                           <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{file.name}</p>
                          <p className="text-xs text-on-surface-variant">
                            {file.size} • {file.stage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary tabular-nums">{file.progress}%</span>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Animated progress bar */}
                    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", file.status === 'error' ? "bg-error" : "bg-primary")}
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                      />
                    </div>

                    {/* Completion: stats + download */}
                    {file.status === 'completed' && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2 pt-1"
                      >
                        {file.resultStats && (
                          <div className="flex gap-4 text-xs font-bold">
                            <span className="text-[#006644]">Forwarded: {file.resultStats.forwarded}</span>
                            <span className="text-[#DE350B]">Dropped: {file.resultStats.dropped}</span>
                            <span className="text-on-surface-variant">Total: {file.resultStats.total}</span>
                          </div>
                        )}
                        {file.outputFile && (
                          <a
                            href={`http://localhost:3001/api/v1/download/${file.outputFile}`}
                            download
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 bg-primary-fixed/30 px-3 py-1 rounded w-fit"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Filtered PCAP
                          </a>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="bg-surface-container-low px-8 py-5 border-t border-outline-variant flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">
            Drop any .pcap file above to start DPI processing.
          </p>
          <button
            disabled={!hasCompleted}
            className="px-8 py-2.5 bg-primary text-white rounded font-bold hover:bg-primary-container transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Cpu className="w-4 h-4 text-on-primary/70" />
            View Dashboard
          </button>
        </div>
      </div>

      <div className="bg-secondary-fixed/30 p-5 rounded-xl border border-outline-variant flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <ShieldIcon className="w-5 h-5 text-secondary" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-on-surface text-sm">Security & Privacy Protocol</p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            All uploaded PCAP files are processed in secure volatile memory. Files are automatically purged after analysis. Our DPI Engine does not persist raw network traffic data.
          </p>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
