import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { apiFetch } from '../../services/api';

interface LoginProps {
  onLogin: () => void;
}

export const BackofficeLogin: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Falha no login');
        return;
      }

      onLogin();
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro ao comunicar com o servidor');
    }
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
          <label className="text-gray-600 text-xs font-bold uppercase tracking-wide ml-1 group-focus-within:text-[#0d3c22] transition-colors">E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => {
                setEmail(e.target.value);
                if(error) setError('');
            }}
            placeholder="exemplo@omelro.pt"
            className={`w-full bg-gray-50 border rounded-xl py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0d3c22] focus:border-transparent focus:bg-white transition-all duration-300 outline-none shadow-sm ${error ? 'border-red-300' : 'border-gray-200'}`}
            required
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-gray-600 text-xs font-bold uppercase tracking-wide ml-1 group-focus-within:text-[#0d3c22] transition-colors">Palavra-passe</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => {
                setPassword(e.target.value);
                if(error) setError('');
            }}
            placeholder="••••••••"
            className={`w-full bg-gray-50 border rounded-xl py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0d3c22] focus:border-transparent focus:bg-white transition-all duration-300 outline-none shadow-sm ${error ? 'border-red-300' : 'border-gray-200'}`}
            required
          />
        </div>

        <div className="pt-6">
           <button 
              type="submit"
              className="w-full bg-[#0d3c22] hover:bg-[#0a2e1a] text-white font-extrabold py-4 rounded-xl uppercase tracking-widest transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
           >
              Iniciar Sessão
           </button>
        </div>

      </form>
    </div>
  );
};
