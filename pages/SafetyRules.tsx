import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitor } from '../context/VisitorContext';
import { Layout } from '../components/Layout';
import { UI_LABELS, SAFETY_RULES } from '../constants';
import { Shield, ArrowLeft, Check } from 'lucide-react';

export const SafetyRules: React.FC = () => {
  const navigate = useNavigate();
  const { language, updateVisitorData } = useVisitor();
  const labels = UI_LABELS[language];
  const rules = SAFETY_RULES[language];
  
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleAccept = () => {
    if (hasAccepted) {
        updateVisitorData({ acceptedRules: true });
        navigate('/badge');
    }
  };

  return (
    <Layout showDate={false}>
      <div className="w-full max-w-6xl animate-fade-in-up flex flex-col items-center">
        
        {/* Icone Superior */}
        <div className="w-20 h-20 bg-melro-green/10 rounded-full flex items-center justify-center mb-6">
             <div className="p-3 border-2 border-melro-green rounded-lg">
                <Shield size={32} className="text-melro-green" />
             </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">{labels.rulesTitle}</h2>

        {/* Card Principal - Estilo "Folha de Papel" */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="p-8 md:p-12 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                    {rules.map((rule, idx) => (
                        <li key={idx} className="flex gap-4 items-start text-gray-600 text-sm leading-relaxed">
                            {/* Ponto Verde */}
                            <span className="w-2 h-2 rounded-full bg-melro-green mt-1.5 flex-shrink-0" />
                            <span>{rule}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            {/* Barra de Scroll visual (lado direito) é tratada pelo CSS custom-scrollbar */}
        </div>

        {/* Área de Aceitação e Botões */}
        <div className="w-full flex flex-col items-center gap-8">
            
            {/* Checkbox "Li e aceito" */}
            <div 
                className="flex items-center gap-3 cursor-pointer select-none self-start md:self-center"
                onClick={() => setHasAccepted(!hasAccepted)}
            >
                <div className={`text-lg font-bold border-b-2 transition-colors ${hasAccepted ? 'border-melro-dark text-melro-dark' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {labels.acceptRules}
                </div>
                
                <div className={`w-6 h-6 border-2 rounded transition-colors flex items-center justify-center ${hasAccepted ? 'bg-melro-green border-melro-green' : 'border-gray-300'}`}>
                    {hasAccepted && <Check size={16} className="text-white" strokeWidth={4} />}
                </div>
            </div>

            {/* Barra de Ação Inferior */}
            <div className="w-full flex items-center justify-between pt-4">
                {/* Botão Voltar (Estilo Texto Simples com Seta) */}
                <button 
                    onClick={() => navigate('/form')}
                    className="flex items-center gap-2 text-gray-500 font-bold text-sm hover:text-gray-800 uppercase tracking-wider transition-colors"
                >
                    <ArrowLeft size={18} />
                    {labels.back}
                </button>

                {/* Botão Verde Grande (Estilo do Print) */}
                <button 
                    onClick={handleAccept} 
                    disabled={!hasAccepted}
                    className={`
                        bg-melro-green text-white font-bold py-4 px-8 rounded shadow-md uppercase text-sm tracking-wide
                        transition-all duration-200
                        ${hasAccepted ? 'hover:opacity-90 hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                    `}
                >
                    {labels.rulesButton}
                </button>
            </div>
        </div>
      </div>
    </Layout>
  );
};