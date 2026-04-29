import { User, Mail, Shield, Key, LogOut } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display text-on-surface">User Profile</h2>
        <p className="text-sm text-on-surface-variant mt-1">Manage your personal information and security.</p>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#0052CC] to-[#00B8D9]" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full bg-white p-1 border-4 border-white shadow-md">
              <div className="w-full h-full rounded-full bg-secondary-container flex items-center justify-center text-3xl font-bold text-on-secondary-container">
                AD
              </div>
            </div>
            <button className="px-6 py-2 bg-white border border-outline-variant rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm mb-2">
              Edit Profile
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Full Name</label>
                <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                  <User className="w-4 h-4 text-outline" />
                  <span className="text-sm font-medium text-on-surface">Admin User</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Email Address</label>
                <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                  <Mail className="w-4 h-4 text-outline" />
                  <span className="text-sm font-medium text-on-surface">admin@dpi-engine.local</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Role</label>
                <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                  <Shield className="w-4 h-4 text-outline" />
                  <span className="text-sm font-medium text-on-surface">Super Administrator</span>
                </div>
              </div>
            </div>

            <hr className="border-outline-variant" />

            <div>
              <h3 className="font-bold text-on-surface mb-4">Security</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors text-left group">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-[#42526E]" />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Change Password</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary group-hover:underline">Update</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest border-t border-outline-variant px-8 py-4 flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2 text-[#DE350B] bg-[#FFEBE6] rounded-lg text-sm font-bold hover:bg-[#DE350B] hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
