import { ShieldCheck, Server, Lock, AlertOctagon, Activity } from 'lucide-react';

export default function SecurityStatusPage() {
  const systems = [
    { name: 'DPI Engine Core', status: 'Healthy', icon: Server, color: 'text-[#36B37E]', bg: 'bg-[#E3FCEF]' },
    { name: 'Rule Processor', status: 'Healthy', icon: ShieldCheck, color: 'text-[#36B37E]', bg: 'bg-[#E3FCEF]' },
    { name: 'Encrypted Traffic Analysis', status: 'Disabled', icon: Lock, color: 'text-[#FF8B00]', bg: 'bg-[#FFFAE6]' },
    { name: 'Threat Intelligence Feed', status: 'Disconnected', icon: AlertOctagon, color: 'text-[#DE350B]', bg: 'bg-[#FFEBE6]' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display text-on-surface">Security Status</h2>
        <p className="text-sm text-on-surface-variant mt-1">Real-time health overview of DPI Engine security modules.</p>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden p-8 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-[#E3FCEF] rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-[#006644]" />
        </div>
        <h3 className="text-2xl font-bold font-display text-on-surface mb-2">System Secure</h3>
        <p className="text-sm text-on-surface-variant max-w-md">
          Core packet inspection and rule enforcement are running normally. No active threats detected in the processing pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systems.map((sys) => {
          const Icon = sys.icon;
          return (
            <div key={sys.name} className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${sys.bg} ${sys.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-on-surface">{sys.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${sys.status === 'Healthy' ? 'bg-[#36B37E]' : sys.status === 'Disabled' ? 'bg-[#FFAB00]' : 'bg-[#DE350B]'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{sys.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#091E42] rounded-xl shadow-lg p-6 flex items-center justify-between mt-8 text-white">
        <div className="flex items-center gap-4">
          <Activity className="w-8 h-8 text-[#00B8D9]" />
          <div>
            <h4 className="font-bold">Enterprise Threat Protection</h4>
            <p className="text-sm text-[#97A0AF] mt-0.5">Upgrade to enable real-time threat intelligence feeds.</p>
          </div>
        </div>
        <button className="px-6 py-2.5 bg-[#0052CC] hover:bg-[#0065FF] rounded-lg text-sm font-bold transition-colors">
          Upgrade Now
        </button>
      </div>
    </div>
  );
}
