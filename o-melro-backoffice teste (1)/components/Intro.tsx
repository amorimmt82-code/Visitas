import React, { useEffect, useState } from 'react';

interface IntroProps {
  onComplete: () => void;
}

export const Intro: React.FC<IntroProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 1. Duração da animação de entrada (2.5s)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    // 2. Duração da animação de saída (fade out) + tempo de segurança
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-dark overflow-hidden transition-all duration-1000 ease-in-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 
        Background Decoration: Frutas Flutuantes 
      */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
         <div className="absolute top-[15%] left-[10%] text-6xl animate-float-slow filter blur-[2px]">🍎</div>
         <div className="absolute top-[20%] right-[15%] text-5xl animate-float-medium filter blur-[1px]">🍋</div>
         <div className="absolute bottom-[20%] left-[15%] text-7xl animate-float-fast filter blur-[3px]">🍇</div>
         <div className="absolute bottom-[10%] right-[10%] text-6xl animate-float-slow filter blur-[2px]">🍊</div>
         <div className="absolute top-[5%] left-[50%] -translate-x-1/2 text-4xl animate-float-medium filter blur-[4px]">🍐</div>
      </div>

      {/* Main Logo Container */}
      <div className="relative z-10 flex flex-col items-center animate-scale-in">
        {/* Halo Effect atras do logo - Agora Verde */}
        <div className="absolute -inset-10 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        
        {/* LOGO ATUALIZADO: Certifique-se de ter um arquivo 'logo.png' na raiz/public */}
        <img 
          src="/logo.png" 
          alt="Logo O Melro" 
          className="h-48 w-auto object-contain drop-shadow-2xl relative"
          onError={(e) => {
            // Fallback caso a imagem não exista, volta para o placeholder para não quebrar o layout
            e.currentTarget.src = "https://via.placeholder.com/250x250/10b981/ffffff?text=MELRO";
          }}
        />
        
        <div className="mt-8 flex flex-col items-center gap-2">
            <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                {/* Barra Verde */}
                <div className="h-full bg-emerald-500 animate-[width_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: '0%', animationName: 'loadingBar', animationDuration: '2.5s', animationIterationCount: '1', animationFillMode: 'forwards' }}></div>
            </div>
            <span className="text-emerald-500/80 text-xs uppercase tracking-[0.3em] font-medium animate-pulse mt-2">A Carregar</span>
        </div>
      </div>
      
      <style>{`
        @keyframes loadingBar {
            0% { width: 0%; }
            60% { width: 70%; }
            100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};