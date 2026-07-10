import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // Controls the width
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 200 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size }}>
      {/* 
        IMPORTANTE: 
        O componente agora busca um arquivo chamado 'logo.png' na raiz do seu site.
        Certifique-se de salvar a imagem enviada como 'logo.png' na pasta public ou raiz.
      */}
      <img 
        src="/logo.png" 
        alt="O Melro" 
        className="w-full h-auto object-contain"
        // Fallback para caso a imagem não esteja na pasta correta
        onError={(e) => {
            e.currentTarget.style.display = 'none';
            const span = document.createElement('span');
            span.innerText = '⚠️ Salve a imagem como logo.png';
            span.style.color = '#EF4444';
            span.style.fontSize = '12px';
            span.style.fontWeight = 'bold';
            e.currentTarget.parentElement?.appendChild(span);
        }}
      />
    </div>
  );
};