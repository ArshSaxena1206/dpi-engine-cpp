import React from 'react';
import { Search, Bell, Settings, HelpCircle, Menu } from 'lucide-react';

interface TopNavProps {
  title: string;
}

export default function TopNav({ title }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 h-16 w-full bg-white border-b border-outline-variant shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-container rounded-full transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-[#091E42] tracking-tight font-display">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block w-64 lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
          <input
            className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
            placeholder="Search flows, IPs, signatures..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-1 border-l border-outline-variant pl-4">
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F4F5F7] transition-colors text-[#42526E]">
            <Bell className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F4F5F7] transition-colors text-[#42526E]">
            <Settings className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F4F5F7] transition-colors text-[#42526E]">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        <button className="w-8 h-8 rounded-full bg-secondary-container overflow-hidden border border-outline-variant hover:ring-2 hover:ring-primary-container transition-all ml-2">
          <img
            alt="Profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY-kFf1MadjxkKEPdff399Dnstg7uq3KFgBNR8u6GfohbdCxWhwJcQ6nqb3I7kgRiDFRH-AiifBNd_0T4yJYSWRwU5p-hamP9WKFy61siGiKdsiEuoXEtPZ9No8TC7PzoV8B3cHlsAbJHT8cByiF_xg-rpNgz9zEV72F9NIi_JpsVLuRCMrwyeDuwS12vZEWKt6_Mx4iz2yahR4pXM2EE5K1euYZ2Wtw96KxLJjXVy6OKdPkCHyC_qQaWWS3Ay1c8J-mhwtMzt_U0"
          />
        </button>
      </div>
    </header>
  );
}
