import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { AgentProvider } from './context/AgentContext';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <AgentProvider>
            <AppRoutes />
          </AgentProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
