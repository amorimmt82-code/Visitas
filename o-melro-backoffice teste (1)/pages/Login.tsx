import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validação de Email (Deve conter 'omelro')
    // Usamos toLowerCase() para garantir que 'Omelro', 'OMELRO' ou 'omelro' funcionem.
    if (!email.toLowerCase().includes('omelro')) {
        setError('Acesso restrito: O e-mail deve pertencer ao domínio O Melro.');
        return;
    }

    // 2. Validação de Senha (Hardcoded para MVP)
    if (password !== 'melro2026') {
        setError('Palavra-passe incorreta.');
        return;
    }

    // Sucesso
    onLogin();
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Mensagem de Erro */}
        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center gap-3 animate-fade-in">
                <AlertCircle className="text-red-500 shrink-0" size={20} />
                <span className="text-sm font-medium text-red-700">{error}</span>
            </div>
        )}

        <div className="space-y-2 group">
          <label className="text-gray-600 text-xs font-bold uppercase tracking-wide ml-1 group-focus-within:text-primary transition-colors">E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => {
                setEmail(e.target.value);
                if(error) setError('');
            }}
            placeholder="exemplo@omelro.pt"
            className={`w-full bg-gray-50 border rounded-xl py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all duration-300 outline-none shadow-sm ${error ? 'border-red-300' : 'border-gray-200'}`}
            required
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-gray-600 text-xs font-bold uppercase tracking-wide ml-1 group-focus-within:text-primary transition-colors">Palavra-passe</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => {
                setPassword(e.target.value);
                if(error) setError('');
            }}
            placeholder="••••••••"
            className={`w-full bg-gray-50 border rounded-xl py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all duration-300 outline-none shadow-sm ${error ? 'border-red-300' : 'border-gray-200'}`}
            required
          />
        </div>

        <div className="pt-6">
           <button 
              type="submit"
              className="w-full bg-primary hover:bg-primaryHover text-white font-extrabold py-4 rounded-xl uppercase tracking-widest transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
           >
              Iniciar Sessão
           </button>
        </div>

      </form>
    </div>
  );
};