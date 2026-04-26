import { Activity, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Stats } from '../App';
import { cn } from '../lib/utils';

interface DashboardProps {
  stats: Stats | null;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#64748b'];

export default function Dashboard({ stats }: DashboardProps) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
        <Activity className="w-12 h-12 text-slate-300 animate-pulse" />
        <p>No statistics available. Please upload a PCAP file to get started.</p>
      </div>
    );
  }

  const { metrics, apps } = stats;

  const metricCards = [
    { label: 'Total Packets', value: metrics.totalPackets, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Forwarded', value: metrics.forwarded, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Dropped', value: metrics.dropped, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Active Flows', value: metrics.activeFlows, icon: ArrowUpRight, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  // Prepare data for pie chart
  const pieData = apps.filter(a => a.count > 0).map(a => ({ name: a.name, value: a.count }));

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, i) => (
          <div key={i} className="card flex items-center space-x-4">
            <div className={cn('p-3 rounded-xl', m.bg)}>
              <m.icon className={cn('w-6 h-6', m.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{m.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{m.value.toLocaleString()}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-800">Traffic Breakdown (Packets)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={apps} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-800">Application Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-\${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center text-xs text-slate-600">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
