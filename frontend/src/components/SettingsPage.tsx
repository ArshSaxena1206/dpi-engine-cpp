import { useState } from 'react';
import { Settings, Monitor, Bell, Database, Shield, Save, RotateCcw, Sun, Moon, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

type SettingsTab = 'engine' | 'network' | 'appearance' | 'notifications' | 'data';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('engine');

  // Engine settings
  const [maxThreads, setMaxThreads] = useState(4);
  const [maxFileSize, setMaxFileSize] = useState(100);
  const [autoProcess, setAutoProcess] = useState(true);
  const [deepInspection, setDeepInspection] = useState(true);
  const [sslDecryption, setSslDecryption] = useState(false);

  // Network settings
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');
  const [wsReconnect, setWsReconnect] = useState(true);
  const [reconnectInterval, setReconnectInterval] = useState(5);
  const [requestTimeout, setRequestTimeout] = useState(30);

  // Appearance
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);

  // Notifications
  const [jobComplete, setJobComplete] = useState(true);
  const [jobFailed, setJobFailed] = useState(true);
  const [connectionLost, setConnectionLost] = useState(true);
  const [ruleChanges, setRuleChanges] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Data
  const [retentionDays, setRetentionDays] = useState(30);
  const [autoExport, setAutoExport] = useState(false);

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    setMaxThreads(4);
    setMaxFileSize(100);
    setAutoProcess(true);
    setDeepInspection(true);
    setSslDecryption(false);
    setBackendUrl('http://localhost:3001');
    setWsReconnect(true);
    setReconnectInterval(5);
    setRequestTimeout(30);
    setTheme('light');
    setCompactMode(false);
    setAnimations(true);
    setJobComplete(true);
    setJobFailed(true);
    setConnectionLost(true);
    setRuleChanges(false);
    setSoundEnabled(false);
    setRetentionDays(30);
    setAutoExport(false);
    toast('Settings reset to defaults', { icon: '🔄' });
  };

  const tabs = [
    { id: 'engine' as SettingsTab, label: 'Engine', icon: Settings },
    { id: 'network' as SettingsTab, label: 'Network', icon: Monitor },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'data' as SettingsTab, label: 'Data', icon: Database },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display text-on-surface">Settings</h2>
        <p className="text-sm text-on-surface-variant mt-1">Configure DPI Engine behavior, appearance, and integrations.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all border-l-[3px] ${
                    isActive
                      ? 'bg-primary-fixed/30 text-primary border-l-primary font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-low border-l-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 space-y-6"
          >
            {/* Engine Settings */}
            {activeTab === 'engine' && (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Engine Configuration</h3>
                    <p className="text-xs text-on-surface-variant">Core DPI engine processing parameters</p>
                  </div>
                </div>

                <SettingRow label="Max Processing Threads" description="Number of concurrent threads for packet analysis">
                  <select value={maxThreads} onChange={e => setMaxThreads(+e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-32">
                    {[1, 2, 4, 8, 16].map(v => <option key={v} value={v}>{v} threads</option>)}
                  </select>
                </SettingRow>

                <SettingRow label="Max Upload File Size" description="Maximum PCAP file size in megabytes">
                  <div className="flex items-center gap-3">
                    <input type="range" min={10} max={500} value={maxFileSize} onChange={e => setMaxFileSize(+e.target.value)} className="w-32 accent-[#0052CC]" />
                    <span className="text-sm font-bold text-on-surface tabular-nums w-16 text-right">{maxFileSize} MB</span>
                  </div>
                </SettingRow>

                <SettingRow label="Auto-Process on Upload" description="Automatically start DPI analysis when a file is uploaded">
                  <Toggle checked={autoProcess} onChange={setAutoProcess} />
                </SettingRow>

                <SettingRow label="Deep Packet Inspection" description="Enable full payload inspection for enhanced detection">
                  <Toggle checked={deepInspection} onChange={setDeepInspection} />
                </SettingRow>

                <SettingRow label="SSL/TLS Decryption" description="Attempt to decrypt encrypted traffic (requires keys)">
                  <Toggle checked={sslDecryption} onChange={setSslDecryption} />
                </SettingRow>
              </>
            )}

            {/* Network Settings */}
            {activeTab === 'network' && (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-[#E3FCEF] flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-[#006644]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Network Configuration</h3>
                    <p className="text-xs text-on-surface-variant">Backend connection and WebSocket settings</p>
                  </div>
                </div>

                <SettingRow label="Backend API URL" description="The base URL for the DPI Engine backend server">
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={e => setBackendUrl(e.target.value)}
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </SettingRow>

                <SettingRow label="Auto-Reconnect WebSocket" description="Automatically reconnect when WebSocket connection drops">
                  <Toggle checked={wsReconnect} onChange={setWsReconnect} />
                </SettingRow>

                <SettingRow label="Reconnect Interval" description="Seconds between reconnection attempts">
                  <select value={reconnectInterval} onChange={e => setReconnectInterval(+e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-32">
                    {[1, 3, 5, 10, 30].map(v => <option key={v} value={v}>{v}s</option>)}
                  </select>
                </SettingRow>

                <SettingRow label="Request Timeout" description="Maximum wait time for API requests in seconds">
                  <select value={requestTimeout} onChange={e => setRequestTimeout(+e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-32">
                    {[10, 15, 30, 60, 120].map(v => <option key={v} value={v}>{v}s</option>)}
                  </select>
                </SettingRow>
              </>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-[#EAE6FF] flex items-center justify-center">
                    <Palette className="w-5 h-5 text-[#403294]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Appearance</h3>
                    <p className="text-xs text-on-surface-variant">Customize the look and feel of the dashboard</p>
                  </div>
                </div>

                <SettingRow label="Theme" description="Choose your preferred color scheme">
                  <div className="flex gap-2">
                    {([
                      { id: 'light', icon: Sun, label: 'Light' },
                      { id: 'dark', icon: Moon, label: 'Dark' },
                      { id: 'system', icon: Monitor, label: 'System' },
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setTheme(opt.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                          theme === opt.id
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </SettingRow>

                <SettingRow label="Compact Mode" description="Reduce spacing and padding for denser information display">
                  <Toggle checked={compactMode} onChange={setCompactMode} />
                </SettingRow>

                <SettingRow label="Animations" description="Enable smooth transitions and micro-animations">
                  <Toggle checked={animations} onChange={setAnimations} />
                </SettingRow>
              </>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-[#FFFAE6] flex items-center justify-center">
                    <Bell className="w-5 h-5 text-[#FF8B00]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Notification Preferences</h3>
                    <p className="text-xs text-on-surface-variant">Control when and how you receive alerts</p>
                  </div>
                </div>

                <SettingRow label="Job Completed" description="Notify when a PCAP processing job finishes successfully">
                  <Toggle checked={jobComplete} onChange={setJobComplete} />
                </SettingRow>

                <SettingRow label="Job Failed" description="Notify when a PCAP processing job encounters an error">
                  <Toggle checked={jobFailed} onChange={setJobFailed} />
                </SettingRow>

                <SettingRow label="Connection Lost" description="Notify when the WebSocket connection to backend drops">
                  <Toggle checked={connectionLost} onChange={setConnectionLost} />
                </SettingRow>

                <SettingRow label="Rule Changes" description="Notify when blocking rules are created, updated, or deleted">
                  <Toggle checked={ruleChanges} onChange={setRuleChanges} />
                </SettingRow>

                <SettingRow label="Sound Effects" description="Play audio cues for important notifications">
                  <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
                </SettingRow>
              </>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-[#FFEBE6] flex items-center justify-center">
                    <Database className="w-5 h-5 text-[#DE350B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Data Management</h3>
                    <p className="text-xs text-on-surface-variant">Configure data retention and export policies</p>
                  </div>
                </div>

                <SettingRow label="Stats Retention Period" description="How long to keep historical statistics data">
                  <select value={retentionDays} onChange={e => setRetentionDays(+e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-32">
                    {[7, 14, 30, 60, 90].map(v => <option key={v} value={v}>{v} days</option>)}
                  </select>
                </SettingRow>

                <SettingRow label="Auto-Export Results" description="Automatically export results after each processing job">
                  <Toggle checked={autoExport} onChange={setAutoExport} />
                </SettingRow>

                <SettingRow label="Clear Processing History" description="Remove all stored stats and processing records">
                  <button
                    onClick={() => toast.success('Processing history cleared')}
                    className="px-4 py-1.5 bg-[#FFEBE6] text-[#DE350B] rounded-lg text-xs font-bold hover:bg-[#DE350B] hover:text-white transition-all"
                  >
                    Clear History
                  </button>
                </SettingRow>

                <SettingRow label="Clear Uploaded Files" description="Remove all uploaded PCAP files from the server">
                  <button
                    onClick={() => toast.success('Uploaded files cleared')}
                    className="px-4 py-1.5 bg-[#FFEBE6] text-[#DE350B] rounded-lg text-xs font-bold hover:bg-[#DE350B] hover:text-white transition-all"
                  >
                    Clear Files
                  </button>
                </SettingRow>
              </>
            )}
          </motion.div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-container transition-all shadow-md active:scale-95"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Components ──────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-primary' : 'bg-[#DFE1E6]'
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
