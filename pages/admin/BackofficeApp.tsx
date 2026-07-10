import React, { useState } from 'react';
import { BackofficeIntro } from './BackofficeIntro';
import { BackofficeLayout } from './BackofficeLayout';
import { BackofficeLogin } from './BackofficeLoginPage';
import { BackofficeDashboard } from './BackofficeDashboard';
import { BackofficeHistory } from './BackofficeHistory';

type PageView = 'LOGIN' | 'DASHBOARD' | 'HISTORY';

export const BackofficeApp: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('LOGIN');

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage('DASHBOARD');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('LOGIN');
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      return <BackofficeLogin onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'DASHBOARD':
        return (
          <BackofficeDashboard
            onNavigateHistory={() => setCurrentPage('HISTORY')}
          />
        );
      case 'HISTORY':
        return <BackofficeHistory onBack={() => setCurrentPage('DASHBOARD')} />;
      default:
        return (
          <BackofficeDashboard
            onNavigateHistory={() => setCurrentPage('HISTORY')}
          />
        );
    }
  };

  return (
    <>
      {showIntro ? (
        <BackofficeIntro onComplete={() => setShowIntro(false)} />
      ) : (
        <BackofficeLayout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
          {renderContent()}
        </BackofficeLayout>
      )}
    </>
  );
};
