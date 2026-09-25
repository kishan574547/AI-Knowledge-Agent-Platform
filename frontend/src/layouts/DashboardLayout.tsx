import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { DashboardProvider } from '../context/DashboardContext';

export const DashboardLayout: React.FC = () => {
  return (
    <DashboardProvider>
      <div className="h-screen flex flex-col bg-base text-text-main overflow-hidden">
        <Navbar />
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </DashboardProvider>
  );
};
