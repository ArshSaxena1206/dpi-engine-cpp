/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar, { Page } from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Rules from './components/Rules';
import Logs from './components/Logs';
import BottomNav from './components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'upload': return <Upload />;
      case 'rules': return <Rules />;
      case 'logs': return <Logs />;
      default: return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'DPI Engine Dashboard';
      case 'upload': return 'PCAP Data Processing';
      case 'rules': return 'Security Rules Manager';
      case 'logs': return 'Network Traffic Logs';
      default: return 'DPI Engine';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      
      <div className="flex-1 flex flex-col md:ml-64 w-full h-screen overflow-hidden">
        <TopNav title={getPageTitle()} />
        
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
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Spacer for mobile nav */}
          <div className="h-20 md:hidden" />
        </main>
      </div>

      <BottomNav activePage={activePage} onPageChange={setActivePage} />
    </div>
  );
}
