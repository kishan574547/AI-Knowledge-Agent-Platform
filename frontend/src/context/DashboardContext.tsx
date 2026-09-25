import React, { createContext, useContext, useState } from 'react';

type ActiveTab = 'chat' | 'documents';

interface DashboardContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  totalDocCount: number;
  setTotalDocCount: (count: number) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [totalDocCount, setTotalDocCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isUploadModalOpen,
        setIsUploadModalOpen,
        totalDocCount,
        setTotalDocCount,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
