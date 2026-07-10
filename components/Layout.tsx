import React, { useEffect, useState } from 'react';
import { useVisitor } from '../context/VisitorContext';
import { Logo } from './Logo';
import { Minimize2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  showDate?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showDate = true }) => {
  const { language } = useVisitor();
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    // Format: "quarta-feira, 21 de janeiro de 2026, 11:42"
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      setCurrentDate(now.toLocaleDateString(language, options));
    };

    updateDate();
    const timer = setInterval(updateDate, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-melro-text font-sans">
      <header className="pt-8 px-8 md:px-16 flex justify-between items-start no-print">
        <div className="flex flex-col">
          {/* Unified Logo Component */}
          <div className="mb-1 -ml-3">
            <Logo size={220} />
          </div>
          {showDate && (
            <div className="flex flex-col mt-2 ml-1 animate-fade-in">
              <p className="text-melro-dark font-bold text-lg md:text-xl capitalize leading-tight">
                {currentDate}
              </p>
              {/* Barra decorativa verde */}
              <div className="h-1.5 w-16 bg-melro-green rounded-full mt-2 opacity-80"></div>
            </div>
          )}
        </div>
        {(window as any).electronAPI?.isElectron && (
          <button
            onClick={() => (window as any).electronAPI.toggleFullscreen()}
            className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Sair do ecrã inteiro"
          >
            <Minimize2 size={20} />
          </button>
        )}
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 w-full max-w-7xl mx-auto">
        {children}
      </main>

      <footer className="py-6 text-center text-gray-300 text-xs no-print">
        &copy; {new Date().getFullYear()} O Melro.
      </footer>
    </div>
  );
};
