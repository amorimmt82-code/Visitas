import React from 'react';
import { Logo } from './Logo';
import { LayoutDashboard, History, Filter } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Últimas Visitas', path: '/admin/history', icon: <History size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-melro-text font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-12">
            <div className="w-32 cursor-pointer" onClick={() => navigate('/admin/dashboard')}>
                 <Logo size={120} />
            </div>
            
            {/* Navigation (Simple tabs style) */}
            <nav className="hidden md:flex gap-8">
                {menuItems.map(item => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider py-2 border-b-2 transition-colors
                            ${location.pathname === item.path 
                                ? 'border-melro-dark text-melro-dark' 
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>
        </div>

        <div className="flex items-center gap-4">
            <button 
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600"
            >
                <Filter size={16} />
                Filtrar
            </button>
            <button 
                onClick={handleLogout}
                className="text-red-500 font-bold text-xs uppercase hover:text-red-700 transition-colors"
            >
                Terminar Sessão
            </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto animate-fade-in">
        {children}
      </main>
    </div>
  );
};
