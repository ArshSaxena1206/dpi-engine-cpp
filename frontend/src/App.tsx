import { useState } from 'react';
import Sidebar, { type Page } from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Rules from './components/Rules';
import Logs from './components/Logs';
import BottomNav from './components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { useSocket } from './hooks/useSocket';

export type { AppStats } from './hooks/useSocket';

import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import NotificationsPage from './components/NotificationsPage';
import HelpPage from './components/HelpPage';
import SecurityStatusPage from './components/SecurityStatusPage';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const { socket, status, stats } = useSocket();

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'DPI Engine Dashboard';
      case 'upload': return 'PCAP Data Processing';
      case 'rules': return 'Security Rules Manager';
      case 'logs': return 'Network Traffic Logs';
      case 'settings': return 'System Settings';
      case 'profile': return 'User Profile';
      case 'notifications': return 'Notifications';
      case 'help': return 'Help & Support';
      case 'security': return 'Security Status';
      default: return 'DPI Engine';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      
      <div className="flex-1 flex flex-col md:ml-64 w-full h-screen overflow-hidden">
        <TopNav title={getPageTitle()} connectionStatus={status} onPageChange={setActivePage} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activePage === 'dashboard' && <Dashboard stats={stats} onPageChange={setActivePage} />}
                {activePage === 'upload' && <Upload socket={socket} onPageChange={setActivePage} />}
                {activePage === 'rules' && <Rules />}
                {activePage === 'logs' && <Logs stats={stats} />}
                {activePage === 'settings' && <SettingsPage />}
                {activePage === 'profile' && <ProfilePage />}
                {activePage === 'notifications' && <NotificationsPage />}
                {activePage === 'help' && <HelpPage />}
                {activePage === 'security' && <SecurityStatusPage />}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Spacer for mobile nav */}
          <div className="h-20 md:hidden" />
        </main>
      </div>

      <BottomNav activePage={activePage} onPageChange={setActivePage} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#091E42',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </div>
  );
}
