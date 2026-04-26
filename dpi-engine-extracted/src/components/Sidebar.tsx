import React from 'react';
import { LayoutDashboard, CloudUpload, Gavel, List, Shield, HelpCircle, ShieldCheck as Verified } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type Page = 'dashboard' | 'upload' | 'rules' | 'logs';

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
}

export default function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: CloudUpload },
    { id: 'rules', label: 'Rules', icon: Gavel },
    { id: 'logs', label: 'Logs', icon: List },
  ];

  const bottomItems = [
    { label: 'Security Status', icon: Verified },
    { label: 'Support', icon: HelpCircle },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen flex flex-col z-50 bg-[#091E42] text-white w-64 border-r border-slate-800 hidden md:flex">
      <div className="px-6 py-8 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
             <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">DPI Engine</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">v2.4.0-Enterprise</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id as Page)}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-3 cursor-pointer transition-all duration-200 group",
                    isActive 
                      ? "bg-[#0052CC] text-white border-l-4 border-white" 
                      : "text-[#97A0AF] hover:text-white hover:bg-[#172B4D]"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "fill-white/20" : "")} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 mt-auto border-t border-slate-800/50">
        <ul className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button className="w-full flex items-center gap-3 px-4 py-2 cursor-pointer text-[#97A0AF] hover:text-white hover:bg-[#172B4D] rounded transition-all duration-200">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
