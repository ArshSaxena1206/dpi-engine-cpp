import { useState, useEffect } from 'react';
import { Shield, Plus, X, Server, Globe, MonitorSmartphone } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Rules() {
  const [rules, setRules] = useState<{ ips: string[]; apps: string[]; domains: string[] }>({
    ips: [],
    apps: [],
    domains: []
  });
  const [newDomain, setNewDomain] = useState('');
  const [newIp, setNewIp] = useState('');

  const commonApps = ['YouTube', 'Facebook', 'TikTok', 'Instagram', 'Twitter', 'Netflix'];

  const fetchRules = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/rules');
      if (res.ok) {
        setRules(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch rules', err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const saveRules = async (newRules: typeof rules) => {
    setRules(newRules);
    try {
      await fetch('http://localhost:3001/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRules)
      });
    } catch (err) {
      console.error('Failed to save rules', err);
    }
  };

  const toggleApp = (app: string) => {
    const newApps = rules.apps.includes(app)
      ? rules.apps.filter(a => a !== app)
      : [...rules.apps, app];
    saveRules({ ...rules, apps: newApps });
  };

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDomain && !rules.domains.includes(newDomain)) {
      saveRules({ ...rules, domains: [...rules.domains, newDomain] });
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    saveRules({ ...rules, domains: rules.domains.filter(d => d !== domain) });
  };

  const addIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIp && !rules.ips.includes(newIp)) {
      saveRules({ ...rules, ips: [...rules.ips, newIp] });
      setNewIp('');
    }
  };

  const removeIp = (ip: string) => {
    saveRules({ ...rules, ips: rules.ips.filter(i => i !== ip) });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-blue-900">Active Filtering</h4>
          <p className="text-sm text-blue-700 mt-1">
            Rules configured here will be applied to the next PCAP file you process. Traffic matching these rules will be dropped.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apps Card */}
        <div className="card space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border">
            <MonitorSmartphone className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Application Blocking</h3>
          </div>
          <div className="space-y-3">
            {commonApps.map(app => (
              <div key={app} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{app}</span>
                <button
                  onClick={() => toggleApp(app)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    rules.apps.includes(app) ? 'bg-danger' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      rules.apps.includes(app) ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Domains Card */}
        <div className="card space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border">
            <Globe className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Domain Blocking</h3>
          </div>
          <form onSubmit={addDomain} className="flex space-x-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. tiktok.com"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="submit" className="btn btn-primary px-3" disabled={!newDomain}>
              <Plus className="w-4 h-4" />
            </button>
          </form>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {rules.domains.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No domains blocked</p>
            ) : (
              rules.domains.map(domain => (
                <div key={domain} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <span className="text-sm text-slate-700">{domain}</span>
                  <button onClick={() => removeDomain(domain)} className="text-slate-400 hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* IPs Card */}
        <div className="card space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2 pb-2 border-b border-border">
            <Server className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">IP Address Blocking</h3>
          </div>
          <form onSubmit={addIp} className="flex space-x-2 max-w-sm">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="e.g. 192.168.1.50"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="submit" className="btn btn-primary px-3" disabled={!newIp}>
              <Plus className="w-4 h-4" />
            </button>
          </form>
          <div className="flex flex-wrap gap-2 pt-2">
            {rules.ips.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No IPs blocked</p>
            ) : (
              rules.ips.map(ip => (
                <div key={ip} className="flex items-center space-x-1 bg-slate-100 rounded-full pl-3 pr-1 py-1 border border-slate-200">
                  <span className="text-sm text-slate-700">{ip}</span>
                  <button onClick={() => removeIp(ip)} className="p-1 text-slate-400 hover:text-danger rounded-full hover:bg-slate-200">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
