import React from 'react';
import { LogOut } from 'lucide-react';
import QrKeyboardListener from '../../components/QrKeyboardListener';

interface LayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, isAuthenticated, onLogout }) => {
  
  // Layout para Visitantes / Login (Não Autenticado)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 transition-colors duration-500 relative overflow-hidden">
        {/* Background gradient subtle hint - Light Version */}
        <QrKeyboardListener />
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />        
        {/* Decorative circle to add depth without clutter */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center w-full">
            {/* Container do Logo */}
            <div className="mb-10 flex flex-col items-center animate-fade-in-up">
            <img 
                src="/logo-login.png" 
                alt="Logo O Melro" 
                className="h-32 w-auto object-contain drop-shadow-xl"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/200x200/0d3c22/ffffff?text=LOGO+LOGIN";
                }}
                />
            </div>

            {/* Container do Conteúdo (Formulário) */}
            <main className="w-full max-w-md animate-fade-in-up [animation-delay:200ms]">
            {children}
            </main>
        </div>
      </div>
    );
  }

  // Layout do Sistema / Dashboard (Autenticado)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 transition-colors duration-500">
        <QrKeyboardListener />
      {/* Brand Header */}
      <header className="w-full flex justify-center py-4 mb-4 bg-primary shadow-md sticky top-0 z-40">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
            <img 
              src="/logo.png" 
              alt="Logo O Melro" 
              className="h-16 w-auto object-contain hover:scale-105 transition-transform duration-300 brightness-0 invert"
              onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/150x150/ffffff/0d3c22?text=MELRO";
                }}
            />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up">
        {children}
      </main>

      {/* Footer / Logout Area */}
      <footer className="w-full py-8 mt-auto flex justify-center">
        <button 
          onClick={onLogout}
          className="group flex items-center gap-2 text-gray-400 font-bold hover:text-red-500 transition-colors uppercase text-sm tracking-wider"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          Terminar Sessão
        </button>
      </footer>
    </div>
  );
};