import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Filter, CheckCircle2, XCircle, Activity, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const barData = [
  { name: 'HTTPS', value: 28 },
  { name: 'DNS', value: 19 },
  { name: 'HTTP', value: 14 },
  { name: 'Apple', value: 9 },
  { name: 'TikTok', value: 5 },
  { name: 'Cloudflare', value: 2 },
];

const pieData = [
  { name: 'HTTPS', value: 36, color: '#0052CC' },
  { name: 'DNS', value: 25, color: '#4C9AFF' },
  { name: 'HTTP', value: 18, color: '#00B8D9' },
  { name: 'Apple', value: 12, color: '#172B4D' },
  { name: 'Other', value: 9, color: '#6554C0' },
];

export default function Dashboard() {
  const stats = [
    { label: 'Total Packets', value: '1.24B', icon: Filter, color: 'bg-surface-container-high', iconColor: 'text-primary' },
    { label: 'Forwarded Packets', value: '1.18B', icon: CheckCircle2, color: 'bg-[#E3FCEF]', iconColor: 'text-[#006644]' },
    { label: 'Dropped Packets', value: '24.5M', icon: XCircle, color: 'bg-[#FFEBE6]', iconColor: 'text-[#DE350B]' },
    { label: 'Active Flows', value: '342K', icon: Activity, color: 'bg-[#EAE6FF]', iconColor: 'text-[#403294]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-on-surface">Network Overview</h2>
          <p className="text-sm text-on-surface-variant font-body-md mt-1">Live traffic analysis and deep packet inspection.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-lg px-3 py-1.5 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
           <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm flex items-start gap-4"
          >
            <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center ${stat.iconColor} shrink-0`}>
              <stat.icon className="w-5 h-5 fill-current/20" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-on-surface font-display">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col h-[450px]"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold font-display text-on-surface">Traffic Breakdown (Packets)</h3>
            <button className="text-primary-container text-sm font-semibold hover:underline flex items-center gap-1 group">
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
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                >
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#0052CC' : '#172B4D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col h-[450px]"
        >
          <h3 className="font-bold font-display text-on-surface mb-8">Application Distribution</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
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
                <span className="text-2xl font-bold text-on-surface">77</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total</span>
              </div>
            </div>

            <div className="w-full mt-6 grid grid-cols-2 gap-y-3 gap-x-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-on-surface-variant truncate whitespace-nowrap">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
