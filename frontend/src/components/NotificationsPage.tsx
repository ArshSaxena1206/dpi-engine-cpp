import { Bell, CheckCircle2, AlertTriangle, Info, Settings } from 'lucide-react';

export default function NotificationsPage() {
  const notifications = [
    { id: 1, type: 'success', title: 'Processing Complete', message: 'test_filtered.pcap was successfully processed. 77 packets analyzed.', time: '2 minutes ago', icon: CheckCircle2, color: 'text-[#36B37E]', bg: 'bg-[#E3FCEF]' },
    { id: 2, type: 'warning', title: 'Rule Updated', message: 'Admin modified the global blocking rule for "TikTok".', time: '1 hour ago', icon: AlertTriangle, color: 'text-[#FF8B00]', bg: 'bg-[#FFFAE6]' },
    { id: 3, type: 'info', title: 'System Update', message: 'DPI Engine v2.4.0 is now live with enhanced SSL parsing.', time: '1 day ago', icon: Info, color: 'text-[#0052CC]', bg: 'bg-primary-fixed' },
    { id: 4, type: 'success', title: 'Processing Complete', message: 'large_capture.pcapng was successfully processed. 14,203 packets analyzed.', time: '2 days ago', icon: CheckCircle2, color: 'text-[#36B37E]', bg: 'bg-[#E3FCEF]' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-on-surface">Notifications</h2>
          <p className="text-sm text-on-surface-variant mt-1">Your recent alerts and system messages.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm">
          <Settings className="w-4 h-4" />
          Preferences
        </button>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Recent</span>
          <button className="text-xs font-bold text-primary hover:underline uppercase tracking-wider">Mark all as read</button>
        </div>
        <div className="divide-y divide-outline-variant">
          {notifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <div key={notif.id} className="p-6 flex gap-4 hover:bg-surface-container-lowest transition-colors cursor-pointer group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.bg} ${notif.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{notif.title}</h4>
                    <span className="text-xs text-on-surface-variant font-medium">{notif.time}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{notif.message}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-lowest text-center">
          <button className="text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">View Older Notifications</button>
        </div>
      </div>
    </div>
  );
}
