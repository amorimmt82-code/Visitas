import { useState } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Scan } from './pages/Scan';
import { Intro } from './components/Intro';
import { PageView } from './types';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('LOGIN');
  // Chave única para forçar remount completo do Scan (evita câmera duplicada)
  const [scanKey, setScanKey] = useState(0);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage('DASHBOARD');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('LOGIN');
  };

  const handleNavigateToScan = () => {
    setScanKey(prev => prev + 1); // força destruição e recriação do componente
    setCurrentPage('SCAN');
  };

  const renderContent = () => {
    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'DASHBOARD':
        return <Dashboard 
          onNavigateHistory={() => setCurrentPage('HISTORY')}
          onNavigateScan={handleNavigateToScan}
        />;
      case 'HISTORY':
        return <History onBack={() => setCurrentPage('DASHBOARD')} />;
      case 'SCAN':
        return <Scan key={scanKey} onBack={() => setCurrentPage('DASHBOARD')} />;
      default:
        return <Dashboard 
          onNavigateHistory={() => setCurrentPage('HISTORY')}
          onNavigateScan={handleNavigateToScan}
        />;
    }
  };

  return (
    <>
      {showIntro ? (
        <Intro onComplete={() => setShowIntro(false)} />
      ) : (
        <Layout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
          {renderContent()}
        </Layout>
      )}
    </>
  );
}

export default App;