import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { MemoryPage } from '../pages/MemoryPage';
import { McpToolsPage } from '../pages/McpToolsPage';
import { MultiAgentResearchPage } from '../pages/MultiAgentResearchPage';
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
        <Route path="mcp-tools" element={<McpToolsPage />} />
        <Route path="multi-agent" element={<MultiAgentResearchPage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};


