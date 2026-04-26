import React from 'react';
import { Download, Search, Filter, Globe, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function Logs() {
  const logs = [
    { domain: 'httpbin.org', app: 'HTTPS', status: 'Allowed', time: '10:42:15 AM' },
    { domain: 'zoom.us', app: 'Zoom', status: 'Allowed', time: '10:41:48 AM' },
    { domain: 'www.youtube.com', app: 'YouTube', status: 'Allowed', time: '10:41:03 AM' },
    { domain: 'www.facebook.com', app: 'Facebook', status: 'Allowed', time: '10:40:55 AM' },
    { domain: 'www.instagram.com', app: 'Instagram', status: 'Allowed', time: '10:40:12 AM' },
    { domain: 'example.com', app: 'HTTPS', status: 'Allowed', time: '10:39:44 AM' },
    { domain: 'open.spotify.com', app: 'Spotify', status: 'Allowed', time: '10:39:21 AM' },
    { domain: 'www.google.com', app: 'Google', status: 'Allowed', time: '10:38:50 AM' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-display text-on-surface">Network Logs</h2>
          <p className="text-on-surface-variant font-body-md text-sm">Real-time deep packet inspection domain tracking.</p>
        </div>
        <button className="bg-primary text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm shrink-0">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-bold text-on-surface font-display">Detected Domains / SNIs</h3>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="Search domains..."
                type="text"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded bg-white text-on-surface text-sm font-semibold hover:bg-surface-container transition-colors shrink-0 shadow-sm">
              <Filter className="w-4 h-4 text-outline" />
              Filter
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant py-4 px-6 w-[45%]">Domain</th>
                <th className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant py-4 px-6 w-[25%]">Application</th>
                <th className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant py-4 px-6 w-[20%]">Status</th>
                <th className="py-4 px-6 w-[10%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-md text-sm text-on-surface">
              {logs.map((log, i) => (
                <motion.tr 
                  key={log.domain + i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-surface-container-low/30 transition-colors group cursor-default"
                >
                  <td className="py-4 px-6 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-outline group-hover:text-primary transition-colors">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                       <p className="font-bold truncate text-on-surface">{log.domain}</p>
                       <p className="text-[10px] text-outline font-semibold uppercase">{log.time}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant font-semibold">
                    {log.app}
                  </td>
                  <td className="py-4 px-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3FCEF] text-[#006644] text-[10px] font-bold uppercase tracking-wider border border-[#006644]/20 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#006644] animate-pulse" />
                      {log.status}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="p-1 px-2 hover:bg-surface-container rounded-md text-outline">
                        <MoreHorizontal className="w-4 h-4" />
                     </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-low/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          <div className="opacity-80">Showing 1 to 8 of 2,341 entries</div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded hover:bg-surface-container text-outline disabled:opacity-30" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
               <button className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center shadow-md">1</button>
               <button className="w-8 h-8 rounded hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center">2</button>
               <button className="w-8 h-8 rounded hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center">3</button>
               <span className="px-2 opacity-50">...</span>
               <button className="w-8 h-8 rounded hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center">293</button>
            </div>
            <button className="p-1.5 rounded hover:bg-surface-container text-on-surface">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
