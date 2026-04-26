import React from 'react';
import { LayoutDashboard, CloudUpload, Gavel, List } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Page } from './Sidebar';

interface BottomNavProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
}

export default function BottomNav({ activePage, onPageChange }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: CloudUpload },
    { id: 'rules', label: 'Rules', icon: Gavel },
    { id: 'logs', label: 'Logs', icon: List },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center h-16 bg-white pb-safe border-t border-outline-variant md:hidden z-50 shadow-[0_-2px_10px_rgba(9,30,66,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as Page)}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-all duration-200 active:scale-95",
              isActive ? "text-[#0052CC]" : "text-[#6B778C]"
            )}
          >
            <div className="relative">
              <Icon className={cn("w-5 h-5", isActive ? "fill-[#0052CC]/10" : "")} />
              {isActive && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider",
              isActive ? "opacity-100" : "opacity-70"
            )}>
              {item.label}
            </span>
            {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-md" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
