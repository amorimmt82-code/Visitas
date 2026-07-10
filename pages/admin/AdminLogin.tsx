import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { apiFetch } from '../../services/api';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const response = await apiFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json();
      alert(err.error || 'Falha no login');
      return;
    }

    const data = await response.json();
    console.log('Login bem-sucedido:', data);
    navigate('/admin/dashboard');

  } catch (err) {
    console.error('Erro no login:', err);
    alert('Erro ao comunicar com o servidor');
  }
};


  return (
    <div className="min-h-screen bg-[#1F2937] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center animate-fade-in-up">
        
        {/* Logo Branca Invertida via CSS Filter ou apenas usando o formato */}
        <div className="mb-12 filter brightness-0 invert opacity-90">
            <Logo size={280} />
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6">
            <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">E-mail</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Introduza o seu e-mail"
                    className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
            </div>

            <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">Palavra-passe</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduza a palavra-passe"
                    className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
            </div>

            <button 
                type="submit"
                className="w-full bg-[#FBBF24] hover:bg-[#F59E0B] text-[#1F2937] font-black text-sm uppercase tracking-widest py-4 rounded-lg shadow-lg transition-all transform active:scale-95 mt-8"
            >
                Iniciar Sessão
            </button>
        </form>
      </div>
    </div>
  );
};
