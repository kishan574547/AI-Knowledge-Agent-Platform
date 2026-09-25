import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardProvider } from '../context/DashboardContext';
import { AppSidebar } from '../components/AppSidebar';
import { TopBar } from '../components/TopBar';

export const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <DashboardProvider>
      <div className="h-screen flex overflow-hidden bg-base text-text-main">
        {/* Persistent Left Sidebar */}
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        {/* Right Column: top bar + page content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />

          <main className="flex-1 overflow-hidden flex flex-col min-h-0 px-4 sm:px-6 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
};
