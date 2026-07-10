import React, { useEffect, useState, useRef } from 'react';
import QrKeyboardListener from '../components/QrKeyboardListener';
import { Clock, AlertTriangle } from 'lucide-react';

export const ExitPage: React.FC = () => {
  const [status, setStatus] = useState<'waiting' | 'processing' | 'success' | 'error' | 'already-exited'>('waiting');
  const [message, setMessage] = useState('Escaneie o crachá para registar saída...');
  const [visitorName, setVisitorName] = useState('');
  const lastScanPhoneRef = useRef<string | null>(null);

  const dismissOverlay = () => {
    setStatus('waiting');
    setMessage('Escaneie o crachá para registar saída...');
    lastScanPhoneRef.current = null;
    setVisitorName('');
  };

  useEffect(() => {
    const handleQrScanned = (event: CustomEvent) => {
      const { parsed, result } = event.detail;
      
      // Dedup: ignora mesmo telefone se já processado recentemente
      const phone = parsed?.p || '';
      if (lastScanPhoneRef.current === phone && status !== 'waiting') return;
      lastScanPhoneRef.current = phone;

      if (result.type === 'EXIT') {
        setVisitorName(result.visit?.fullName || result.visit?.visitorName || parsed?.n || '');
        setStatus('success');
        setMessage('Saída registada com sucesso!');
        setTimeout(() => {
          dismissOverlay();
        }, 5000);
      } else if (result.type === 'ALREADY_EXITED') {
        setVisitorName(result.visit?.fullName || result.visit?.visitorName || parsed?.n || '');
        setStatus('already-exited');
        setMessage(result.message || 'Já registou saída.');
      } else if (result.type === 'ENTRY') {
        setStatus('error');
        setMessage('⚠️ Este crachá é para entrada.');
        setTimeout(dismissOverlay, 3000);
      } else {
        setStatus('error');
        setMessage('❌ ' + (result.message || 'QR inválido'));
        setTimeout(dismissOverlay, 3000);
      }
    };

    window.addEventListener('qr-scanned', handleQrScanned as EventListener);
    return () => window.removeEventListener('qr-scanned', handleQrScanned as EventListener);
  }, [status]);

  // Overlay "Goodbye" — saída com sucesso
  if (status === 'success') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-white cursor-pointer select-none"
        onClick={dismissOverlay}
      >
        <QrKeyboardListener />

        <style>{`
          @keyframes exitCheckIn {
            0% { opacity: 0; transform: scale(0.3); }
            50% { opacity: 1; transform: scale(1.1); }
            70% { transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes exitFadeInUp {
            0% { opacity: 0; transform: translateY(16px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes exitFadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
          }
          .exit-check-anim {
            animation: exitCheckIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .exit-feito-anim {
            animation: exitFadeInUp 0.5s ease-out 0.4s both;
          }
          .exit-container-anim {
            animation: exitFadeOut 5s ease-in-out forwards;
          }
        `}</style>

        <div className="flex flex-col items-center exit-container-anim">
          <div className="exit-check-anim">
            <svg className="w-32 h-32 md:w-40 md:h-40 text-melro-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" className="text-melro-green" fill="currentColor" opacity="0.15" />
              <path d="M8 12.5l2.5 3L16 9" strokeWidth="2.5" />
            </svg>
          </div>
          
          <p className="text-3xl md:text-4xl font-bold text-melro-green mt-4 exit-feito-anim">Feito</p>

          {visitorName && (
            <p className="text-xl md:text-2xl font-semibold text-gray-700 mt-3 exit-feito-anim" style={{ animationDelay: '0.55s' }}>{visitorName}</p>
          )}
        </div>
      </div>
    );
  }

  // Overlay "já saiu" — clica para fechar
  if (status === 'already-exited') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-white cursor-pointer select-none"
        onClick={dismissOverlay}
      >
        <QrKeyboardListener />

        <div className="flex flex-col items-center gap-6">
          <svg className="w-24 h-24 md:w-32 md:h-32 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
            <path d="M12 8v4" strokeWidth="2.5" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>

          <p className="text-2xl md:text-3xl font-bold text-gray-800 text-center">
            Este visitante já registou saída.
          </p>

          {visitorName && (
            <p className="text-xl md:text-2xl font-semibold text-gray-500">{visitorName}</p>
          )}
        </div>

        <p className="mt-8 text-gray-400 text-sm animate-pulse">Toque na tela para continuar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
      <QrKeyboardListener />
      <div className="space-y-6 max-w-md">
        <h1 className="text-4xl font-bold text-melro-green mb-4">O Melro</h1>
        
        {status === 'waiting' && (
          <div className="flex flex-col items-center gap-4 text-gray-500">
            <Clock className="w-12 h-12 animate-pulse text-melro-green" />
            <p className="text-lg font-semibold">{message}</p>
          </div>
        )}
        
        {status === 'processing' && (
          <div className="flex flex-col items-center gap-4 text-gray-500">
            <Clock className="w-12 h-12 animate-spin text-melro-green" />
            <p className="text-lg">Processando...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 text-red-600">
            <AlertTriangle className="w-12 h-12" />
            <p className="text-lg font-semibold">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
