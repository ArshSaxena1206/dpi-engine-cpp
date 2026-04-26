import React, { useState, useMemo } from 'react';
import { Download, Search, Globe, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import type { AppStats } from '../hooks/useSocket';

interface LogsProps {
  stats: AppStats | null;
}

const FALLBACK_LOGS = [
  { domain: 'httpbin.org', app: 'HTTPS', status: 'Allowed', time: '—' },
  { domain: 'zoom.us', app: 'Zoom', status: 'Allowed', time: '—' },
  { domain: 'www.youtube.com', app: 'YouTube', status: 'Allowed', time: '—' },
  { domain: 'www.facebook.com', app: 'Facebook', status: 'Allowed', time: '—' },
  { domain: 'www.instagram.com', app: 'Instagram', status: 'Allowed', time: '—' },
  { domain: 'open.spotify.com', app: 'Spotify', status: 'Allowed', time: '—' },
  { domain: 'www.google.com', app: 'Google', status: 'Allowed', time: '—' },
];

type LogEntry = { domain: string; app: string; status: string; time: string };
type SortKey = 'domain' | 'app' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

export default function Logs({ stats }: LogsProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('domain');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const hasData = stats && stats.domains.length > 0;

  const rawLogs: LogEntry[] = hasData
    ? stats!.domains.map(d => {
        const appStat = stats!.apps.find(a => a.name === d.app);
        return {
          domain: d.domain,
          app: d.app,
          status: appStat?.isBlocked ? 'Blocked' : 'Allowed',
          time: '—',
        };
      })
    : FALLBACK_LOGS;

  // ── Filter + Sort ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = rawLogs.filter(
      l => l.domain.toLowerCase().includes(q) ||
           l.app.toLowerCase().includes(q) ||
           l.status.toLowerCase().includes(q)
    );

    list.sort((a, b) => {
      const va = a[sortKey].toLowerCase();
      const vb = b[sortKey].toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [rawLogs, search, sortKey, sortDir]);

  // ── Pagination ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  // ── CSV export ────────────────────────────────────────────────
  const exportCSV = () => {
    const header = 'domain,app,status\n';
    const body = filtered.map(l => `${l.domain},${l.app},${l.status}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-display text-on-surface">Network Logs</h2>
          <p className="text-on-surface-variant text-sm">
            {hasData ? 'Showing results from last PCAP analysis.' : 'Real-time deep packet inspection domain tracking.'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="bg-primary text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Header toolbar */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-bold text-on-surface font-display">Detected Domains / SNIs</h3>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="Search domains, apps, status…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th
                  onClick={() => toggleSort('domain')}
                  className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant py-4 px-6 w-[45%] cursor-pointer select-none hover:text-on-surface transition-colors"
                >
                  Domain <SortIcon col="domain" />
                </th>
                <th
                  onClick={() => toggleSort('app')}
                  className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant py-4 px-6 w-[25%] cursor-pointer select-none hover:text-on-surface transition-colors"
                >
                  Application <SortIcon col="app" />
                </th>
                <th
                  onClick={() => toggleSort('status')}
                  className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant py-4 px-6 w-[20%] cursor-pointer select-none hover:text-on-surface transition-colors"
                >
                  Status <SortIcon col="status" />
                </th>
                <th className="py-4 px-6 w-[10%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-sm text-on-surface">
              {pageSlice.map((log, i) => {
                const globalIdx = (safeCurrentPage - 1) * PAGE_SIZE + i;
                const isExpanded = expandedRow === globalIdx;
                return (
                  <React.Fragment key={log.domain + globalIdx}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setExpandedRow(isExpanded ? null : globalIdx)}
                      className="hover:bg-surface-container-low/30 transition-colors group cursor-pointer"
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
                      <td className="py-4 px-6 text-on-surface-variant font-semibold">{log.app}</td>
                      <td className="py-4 px-6">
                        {log.status === 'Blocked' ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wider border border-error/20 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-error" />
                            Blocked
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3FCEF] text-[#006644] text-[10px] font-bold uppercase tracking-wider border border-[#006644]/20 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#006644] animate-pulse" />
                            Allowed
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-[10px] font-bold text-outline uppercase">
                          {isExpanded ? 'collapse' : 'expand'}
                        </span>
                      </td>
                    </motion.tr>

                    {/* Detail drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <td colSpan={4} className="p-0">
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="bg-surface-container-low/50 px-6 py-5 border-y border-outline-variant"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-on-surface text-sm font-display">Packet Metadata</h4>
                                <button onClick={(e) => { e.stopPropagation(); setExpandedRow(null); }} className="p-1 text-outline hover:text-on-surface rounded">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MetaField label="Domain / SNI" value={log.domain} />
                                <MetaField label="Application" value={log.app} />
                                <MetaField label="Action" value={log.status} />
                                <MetaField label="Protocol" value={log.app === 'DNS' ? 'UDP/53' : 'TCP/443 (TLS)'} />
                              </div>
                              {hasData && stats!.apps.find(a => a.name === log.app) && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <MetaField label="Packets" value={String(stats!.apps.find(a => a.name === log.app)!.count)} />
                                  <MetaField label="% of Traffic" value={`${stats!.apps.find(a => a.name === log.app)!.percentage.toFixed(1)}%`} />
                                </div>
                              )}
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-low/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          <div className="opacity-80">
            Showing {Math.min((safeCurrentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(safeCurrentPage * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="p-1.5 rounded hover:bg-surface-container text-outline disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, safeCurrentPage - 3),
              safeCurrentPage + 2
            ).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center",
                  p === safeCurrentPage ? "bg-primary text-white shadow-md" : "hover:bg-surface-container text-on-surface"
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="p-1.5 rounded hover:bg-surface-container text-on-surface disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{label}</p>
      <p className="text-sm font-bold text-on-surface font-mono">{value}</p>
    </div>
  );
}
