import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white overflow-hidden">
      <Navbar />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};
