import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { MemoryPage } from '../pages/MemoryPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Dashboard & Module Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Placeholder routes for future modules */}
        <Route path="mcp-tools" element={<ComingSoonPage title="MCP Tools" />} />
        <Route path="multi-agent" element={<ComingSoonPage title="Multi-Agent Research" />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// Inline placeholder for future modules
const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col flex-1 items-center justify-center h-full text-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-accent-muted border border-accent/20 flex items-center justify-center text-accent text-2xl mx-auto">
      🚧
    </div>
    <h2 className="font-heading text-lg font-bold text-text-main">{title}</h2>
    <p className="text-sm text-text-muted max-w-sm">
      This module is planned for a future release. Check back soon — we're building it next.
    </p>
  </div>
);
