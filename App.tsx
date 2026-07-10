import React, { useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VisitorProvider, useVisitor } from './context/VisitorContext';
import { SplashScreen } from './components/SplashScreen';
import GlobalScanOverlay from './components/GlobalScanOverlay';
import { LanguageSelection } from './pages/LanguageSelection';
import { EmailEntry } from './pages/EmailEntry';
import { VisitorForm } from './pages/VisitorForm';
import { SafetyRules } from './pages/SafetyRules';
import { BadgeGeneration } from './pages/BadgeGeneration';
import { VisitScanner } from './pages/VisitScanner';
import { ExitPage } from './pages/ExitPage';
import { Home } from 'lucide-react';

const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutos


// Admin Routes
import { BackofficeApp } from './pages/admin/BackofficeApp';

// Componente interno para consumir o contexto
const AppContent: React.FC = () => {
  const { showSplash, setShowSplash, resetVisitor } = useVisitor();
  const isAdminRoute = window.location.hash.startsWith('#/admin');
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBackToStart = useCallback(() => {
    resetVisitor();
    window.location.hash = '#/';
    setShowSplash(true);
  }, [resetVisitor, setShowSplash]);

  // Timer de inatividade — volta ao início após 3 minutos sem interação
  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      // Só ativar o timer se não estiver no splash, nem em rota admin
      const onAdmin = window.location.hash.startsWith('#/admin');
      if (!onAdmin) {
        inactivityTimer.current = setTimeout(() => {
          // Só redirecionar se não estiver já no splash/início
          const hash = window.location.hash;
          if (hash !== '#/' && hash !== '' && !hash.startsWith('#/admin')) {
            handleBackToStart();
          }
        }, INACTIVITY_TIMEOUT);
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [handleBackToStart]);

  return (
    <>
      {/* Scanners QR + Overlays de saída — ativos em TODAS as telas */}
      <GlobalScanOverlay />

      {showSplash && !isAdminRoute && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Botão Casa — Voltar ao Início (visível nas páginas do front office) */}
      {!showSplash && !isAdminRoute && (
        <button
          onClick={handleBackToStart}
          className="fixed bottom-8 left-8 z-[9998] bg-[#0d3c22] hover:bg-[#0a2e1a] text-white p-4 rounded-xl shadow-xl shadow-[#0d3c22]/30 transition-all duration-300 hover:scale-105 active:scale-95"
          title="Voltar ao Início"
        >
          <Home size={20} />
        </button>
      )}

      <div className={showSplash && !isAdminRoute ? 'opacity-0 overflow-hidden h-screen' : 'opacity-100 transition-opacity duration-1000 min-h-screen'}>
        <HashRouter>
            <Routes>
                {/* Visitor Flow */}
                <Route path="/" element={<LanguageSelection />} />
                <Route path="/phone" element={<EmailEntry />} />
                <Route path="/form" element={<VisitorForm />} />
                <Route path="/rules" element={<SafetyRules />} />
                <Route path="/badge" element={<BadgeGeneration />} />
                <Route path="/visit/:id" element={<VisitScanner />} />
                <Route path="/exit" element={<ExitPage />} />

                
                {/* Admin Flow - Self-contained backoffice */}
                <Route path="/admin/*" element={<BackofficeApp />} />
                

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <VisitorProvider>
       <AppContent />
    </VisitorProvider>
  );
};

export default App;