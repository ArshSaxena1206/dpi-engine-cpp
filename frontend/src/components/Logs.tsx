import { FileText, Search } from 'lucide-react';
import type { Stats } from '../App';
import { useState } from 'react';

interface LogsProps {
  stats: Stats | null;
}

export default function Logs({ stats }: LogsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
        <FileText className="w-12 h-12 text-slate-300" />
        <p>No logs available. Process a PCAP file to view detected domains.</p>
      </div>
    );
  }

  const filteredDomains = stats.domains.filter(d => 
    d.domain.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.app.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card h-[calc(100vh-12rem)] flex flex-col p-0 overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-slate-500" />
          Detected Domains / SNIs
        </h3>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-white sticky top-0 shadow-sm">
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Domain</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Application</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {filteredDomains.length > 0 ? (
              filteredDomains.map((item, idx) => {
                // Determine if this app is blocked by checking the apps list in stats
                const appStat = stats.apps.find(a => a.name === item.app);
                const isBlocked = appStat ? appStat.isBlocked : false;

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-mono">
                      {item.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {item.app}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isBlocked ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Allowed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                  No domains found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
