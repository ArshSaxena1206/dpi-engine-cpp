import React, { useState } from 'react';
import { Info, Plus, Trash2, Globe, ShieldCheck, AppWindow, Network, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function Rules() {
  const [apps, setApps] = useState([
    { id: 'youtube', name: 'YouTube', category: 'Video Streaming', blocked: true, iconColor: 'text-[#FF0000]' },
    { id: 'facebook', name: 'Facebook', category: 'Social Media', blocked: false, iconColor: 'text-[#1877F2]' },
    { id: 'whatsapp', name: 'WhatsApp', category: 'Messaging', blocked: false, iconColor: 'text-[#25D366]' },
    { id: 'netflix', name: 'Netflix', category: 'Video Streaming', blocked: false, iconColor: 'text-[#E50914]' },
    { id: 'bittorrent', name: 'BitTorrent', category: 'P2P File Sharing', blocked: true, iconColor: 'text-secondary' },
  ]);

  const [domains, setDomains] = useState([
    { id: '1', name: 'example.com', type: 'Domain Block' },
    { id: '2', name: 'malicious-site.net', type: 'Security Risk' },
    { id: '3', name: '192.168.1.100/32', type: 'IP Block' },
  ]);

  const toggleApp = (id: string) => {
    setApps(prev => prev.map(app => app.id === id ? { ...app, blocked: !app.blocked } : app));
  };

  const removeDomain = (id: string) => {
    setDomains(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold font-display text-on-surface">Traffic Rules Configuration</h2>
        <p className="text-on-surface-variant font-body-md text-sm">Manage DPI filtering policies across applications, domains, and IP addresses.</p>
      </div>

      {/* Info Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-fixed/30 border border-primary-fixed rounded-xl p-5 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary-container shrink-0 shadow-sm">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-primary-container text-sm">Active Filtering Enabled</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed font-body-md">
            Changes applied here will immediately affect network traffic routing. Ensure policies comply with organizational security guidelines before enabling blocking rules.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Control */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-on-surface-variant" />
              <h3 className="font-bold text-on-surface font-display">Application Control</h3>
            </div>
            <span className="bg-error-container text-on-error-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
              {apps.filter(a => a.blocked).length} Blocked
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-surface-variant">
              {apps.map((app) => (
                <div key={app.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded bg-surface-container flex items-center justify-center", app.iconColor)}>
                       <Globe className="w-4 h-4 opacity-80" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{app.name}</p>
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">{app.category}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleApp(app.id)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                      app.blocked ? "bg-error" : "bg-surface-variant"
                    )}
                  >
                    <span 
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm",
                        app.blocked ? "translate-x-6" : "translate-x-1"
                      )} 
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Add Block */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-on-surface-variant" />
            <h3 className="font-bold text-on-surface font-display">Rule Manager</h3>
          </div>
          <div className="p-4 flex flex-col gap-6 flex-1">
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Quick Block</label>
                   <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                      <input 
                        className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                        placeholder="Enter domain or IP address..."
                      />
                   </div>
                </div>
                <button className="w-full bg-primary-container text-white py-2.5 rounded-lg font-bold text-sm hover:bg-primary-container/90 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95">
                  <Plus className="w-4 h-4" />
                  Add to Blocklist
                </button>
             </div>

             <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Custom Rules</label>
                  <span className="text-[10px] text-outline font-bold uppercase">{domains.length} active</span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                   <AnimatePresence>
                      {domains.map((domain) => (
                        <motion.div 
                          key={domain.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="bg-surface-container-low/30 border border-outline-variant p-3 rounded-lg flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-6 bg-error rounded-full opacity-60" />
                             <div>
                                <p className="text-xs font-bold text-on-surface font-code tracking-tight">{domain.name}</p>
                                <p className="text-[10px] font-semibold text-outline uppercase tracking-wider">{domain.type}</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => removeDomain(domain.id)}
                            className="p-1.5 text-outline hover:text-error hover:bg-error-container rounded transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                   </AnimatePresence>
                </div>
             </div>
          </div>
        </div>

        {/* System & Global Policy */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col h-full">
           <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center gap-2">
            <Network className="w-5 h-5 text-on-surface-variant" />
            <h3 className="font-bold text-on-surface font-display">Network Policy</h3>
          </div>
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 flex-1">
             <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant/30">
               <ShieldCheck className="w-10 h-10" />
             </div>
             <div className="space-y-1">
               <h4 className="font-bold text-on-surface">Compliance Verified</h4>
               <p className="text-sm text-on-surface-variant font-body-md leading-relaxed px-4">
                  Standard enterprise policies are currently applied across all network zones.
               </p>
             </div>
             <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 pt-2">
               Download Full Policy Document
               <HelpCircle className="w-3.5 h-3.5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
