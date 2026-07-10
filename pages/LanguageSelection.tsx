import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitor } from '../context/VisitorContext';
import { Layout } from '../components/Layout';
import { Language } from '../types';
import { UI_LABELS } from '../constants';


export const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setLanguage } = useVisitor();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    navigate('/phone');
  };

  return (
    <Layout showDate={false}>
      <div className="flex flex-col items-center animate-fade-in-up">
        <h2 className="text-xl font-bold text-gray-700 mb-1">{UI_LABELS[Language.PT].selectLang}</h2>
        <h3 className="text-lg text-gray-400 mb-12">{UI_LABELS[Language.PT].selectLangSub}</h3>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Portuguese Option */}
          <button
            onClick={() => handleSelect(Language.PT)}
            className="group flex flex-col items-center justify-center w-64 h-64 bg-white rounded-3xl border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-6 transform group-hover:scale-110 transition-transform">
                {/* CSS Circle Flag representation */}
                <div className="w-full h-full bg-red-600 relative">
                    <div className="absolute left-0 top-0 w-1/3 h-full bg-green-600"></div>
                    <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 rounded-full border-2 border-red-600 z-10"></div>
                </div>
            </div>
            <span className="text-lg font-bold text-gray-700">Português</span>
          </button>

          {/* English Option */}
          <button
            onClick={() => handleSelect(Language.EN)}
            className="group flex flex-col items-center justify-center w-64 h-64 bg-white rounded-3xl border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-6 transform group-hover:scale-110 transition-transform">
                {/* CSS Circle Flag representation */}
                <div className="w-full h-full bg-blue-800 relative overflow-hidden">
                   <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-full h-4 bg-white rotate-45 absolute"></div>
                       <div className="w-full h-4 bg-white -rotate-45 absolute"></div>
                       <div className="w-full h-8 bg-white absolute"></div>
                       <div className="h-full w-8 bg-white absolute"></div>
                       
                       <div className="w-full h-2 bg-red-600 rotate-45 absolute"></div>
                       <div className="w-full h-2 bg-red-600 -rotate-45 absolute"></div>
                       <div className="w-full h-5 bg-red-600 absolute"></div>
                       <div className="h-full w-5 bg-red-600 absolute"></div>
                   </div>
                </div>
            </div>
            <span className="text-lg font-bold text-gray-700">English</span>
          </button>

          {/* Spanish Option */}
          <button
            onClick={() => handleSelect(Language.ES)}
            className="group flex flex-col items-center justify-center w-64 h-64 bg-white rounded-3xl border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-6 transform group-hover:scale-110 transition-transform">
                {/* CSS Circle Flag - Spain */}
                <div className="w-full h-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1/4 bg-red-600"></div>
                    <div className="absolute top-1/4 left-0 w-full h-1/2 bg-yellow-400"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/4 bg-red-600"></div>
                </div>
            </div>
            <span className="text-lg font-bold text-gray-700">Español</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};