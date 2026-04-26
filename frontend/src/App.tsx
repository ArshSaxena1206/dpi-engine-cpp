import { useState, useEffect } from 'react';
import { Activity, Upload as UploadIcon, Shield, FileText, LayoutDashboard, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Rules from './components/Rules';
import Logs from './components/Logs';

export type Stats = {
  metrics: {
    totalPackets: number;
    forwarded: number;
    dropped: number;
    activeFlows: number;
  };
  apps: { name: string; count: number; percentage: number; isBlocked: boolean }[];
  domains: { domain: string; app: string }[];
};

function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'upload' | 'rules' | 'logs'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  useEffect(() => {
    fetchStats();
    // Optional: poll every 5s if we had real-time processing
    // const interval = setInterval(fetchStats, 5000);
    // return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload PCAP', icon: UploadIcon },
    { id: 'rules', label: 'Rules', icon: Shield },
    { id: 'logs', label: 'Logs', icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">DPI Engine</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`\${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-surface border-r border-border shrink-0`}>
        <div className="p-6 hidden md:flex items-center space-x-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">DPI Engine</span>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 \${
                currentTab === item.id
                  ? 'bg-primary text-white font-medium shadow-md shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 \${currentTab === item.id ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            {navItems.find((n) => n.id === currentTab)?.label}
          </h1>
          <p className="text-slate-500 mt-1">Manage and monitor deep packet inspection data</p>
        </header>

        <div className="max-w-6xl">
          {currentTab === 'dashboard' && <Dashboard stats={stats} />}
          {currentTab === 'upload' && <Upload onUploadSuccess={fetchStats} />}
          {currentTab === 'rules' && <Rules />}
          {currentTab === 'logs' && <Logs stats={stats} />}
        </div>
      </main>
    </div>
  );
}

export default App;
