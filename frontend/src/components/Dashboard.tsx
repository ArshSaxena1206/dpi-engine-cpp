import { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Filter, CheckCircle2, XCircle, Activity, ArrowRight, Download, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppStats } from '../hooks/useSocket';

interface DashboardProps {
  stats: AppStats | null;
  onPageChange?: (page: 'dashboard' | 'upload' | 'rules' | 'logs') => void;
}

const FALLBACK_BAR = [
  { name: 'HTTPS', value: 28 },
  { name: 'DNS', value: 19 },
  { name: 'HTTP', value: 14 },
  { name: 'Apple', value: 9 },
  { name: 'TikTok', value: 5 },
  { name: 'Cloudflare', value: 2 },
];

const FALLBACK_PIE = [
  { name: 'HTTPS', value: 36, color: '#0052CC' },
  { name: 'DNS', value: 25, color: '#4C9AFF' },
  { name: 'HTTP', value: 18, color: '#00B8D9' },
  { name: 'Apple', value: 12, color: '#172B4D' },
  { name: 'Other', value: 9, color: '#6554C0' },
];

const COLORS = ['#0052CC', '#4C9AFF', '#00B8D9', '#172B4D', '#6554C0', '#36B37E', '#FF5630'];

const TIME_RANGES = [
  { label: 'Last 5 min', limit: 30 },
  { label: 'Last 15 min', limit: 90 },
  { label: 'Last 1 hr', limit: 360 },
] as const;

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

interface HistoryRow {
  id: number;
  timestamp: string;
  forwarded: number;
  dropped: number;
  total: number;
}

export default function Dashboard({ stats, onPageChange }: DashboardProps) {
  const hasData = stats && stats.metrics.totalPackets > 0;
  const [activeRange, setActiveRange] = useState(0);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const metricValues = hasData
    ? {
        total: formatNum(stats!.metrics.totalPackets),
        forwarded: formatNum(stats!.metrics.forwarded),
        dropped: formatNum(stats!.metrics.dropped),
        flows: formatNum(stats!.metrics.activeFlows),
      }
    : { total: '—', forwarded: '—', dropped: '—', flows: '—' };

  const statCards = [
    { label: 'Total Packets', value: metricValues.total, icon: Filter, color: 'bg-surface-container-high', iconColor: 'text-primary' },
    { label: 'Forwarded Packets', value: metricValues.forwarded, icon: CheckCircle2, color: 'bg-[#E3FCEF]', iconColor: 'text-[#006644]' },
    { label: 'Dropped Packets', value: metricValues.dropped, icon: XCircle, color: 'bg-[#FFEBE6]', iconColor: 'text-[#DE350B]' },
    { label: 'Active Flows', value: metricValues.flows, icon: Activity, color: 'bg-[#EAE6FF]', iconColor: 'text-[#403294]' },
  ];

  const barData = hasData
    ? stats!.apps.map(a => ({ name: a.name, value: a.count }))
    : FALLBACK_BAR;

  const pieData = hasData
    ? stats!.apps.filter(a => a.count > 0).map((a, i) => ({
        name: a.name,
        value: a.count,
        color: COLORS[i % COLORS.length],
      }))
    : FALLBACK_PIE;

  const pieTotal = hasData ? stats!.metrics.totalPackets : 77;

  // ── Fetch history for the selected time range ──────────────────
  const fetchHistory = useCallback(async (rangeIdx: number) => {
    setActiveRange(rangeIdx);
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/stats/history?limit=${TIME_RANGES[rangeIdx].limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setHistory(json.data.reverse());
      }
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, []);

  // ── CSV export ─────────────────────────────────────────────────
  const exportCSV = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/stats/history?limit=1000');
      if (!res.ok) return;
      const json = await res.json();
      const rows: HistoryRow[] = json.data ?? [];
      if (rows.length === 0) return;

      const header = 'id,timestamp,forwarded,dropped,total\n';
      const body = rows.map(r => `${r.id},${r.timestamp},${r.forwarded},${r.dropped},${r.total}`).join('\n');
      const blob = new Blob([header + body], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dpi_stats_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, []);

  // Chart data from history
  const historyChartData = history.map((r, i) => ({
    idx: i,
    forwarded: r.forwarded,
    dropped: r.dropped,
    total: r.total,
    label: r.timestamp.split(' ')[1] ?? r.timestamp,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-on-surface">Network Overview</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {hasData ? 'Live traffic analysis from last processed PCAP.' : 'Upload a PCAP file to see real data.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white border border-outline-variant text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-high transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-lg px-3 py-1.5 shadow-sm">
             <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-primary animate-pulse' : 'bg-outline'}`} />
             <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
               {hasData ? 'Data Ready' : 'No Data'}
             </span>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm flex items-start gap-4"
          >
            <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center ${stat.iconColor} shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{stat.label}</p>
              <motion.p
                key={stat.value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-on-surface font-display"
              >
                {stat.value}
              </motion.p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* History time-range chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-on-surface-variant" />
            <h3 className="font-bold font-display text-on-surface">Stats History</h3>
          </div>
          <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
            {TIME_RANGES.map((range, idx) => (
              <button
                key={range.label}
                onClick={() => fetchHistory(idx)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeRange === idx
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="h-[200px] flex items-center justify-center text-on-surface-variant text-sm">Loading…</div>
        ) : historyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={historyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fwdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#36B37E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#36B37E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF5630" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF5630" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ededf8" />
              <XAxis dataKey="label" tick={{ fill: '#737685', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737685', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #c3c6d6' }} />
              <Area type="monotone" dataKey="forwarded" stroke="#36B37E" fill="url(#fwdGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="dropped" stroke="#FF5630" fill="url(#dropGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-on-surface-variant text-sm">
            Select a time range above to load historical data.
          </div>
        )}
      </motion.div>

      {/* Bar + Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col h-[450px]"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold font-display text-on-surface">Traffic Breakdown (Packets)</h3>
            <button 
              onClick={() => onPageChange?.('logs')}
              className="text-primary text-sm font-semibold hover:underline flex items-center gap-1 group"
            >
              View Details
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ededf8" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#737685', fontSize: 12, fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#737685', fontSize: 12, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f3fd' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #c3c6d6', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col h-[450px] overflow-hidden"
        >
          <h3 className="font-bold font-display text-on-surface mb-4 shrink-0">Application Distribution</h3>
          
          <div className="flex-1 flex flex-col items-center min-h-0">
            <div className="relative w-full h-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-on-surface">{formatNum(pieTotal)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total</span>
              </div>
            </div>

            <div className="w-full mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-medium text-on-surface-variant truncate">
                      {item.name} ({item.value}{hasData ? '' : '%'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
