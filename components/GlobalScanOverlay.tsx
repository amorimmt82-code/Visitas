import React, { useState, useEffect, useRef } from 'react';
import QrKeyboardListener from './QrKeyboardListener';

/**
 * Componente global que mantém os scanners QR ativos em TODAS as telas
 * e exibe os overlays de saída (goodbye / already-exited).
 * Deve ser montado uma única vez no App.tsx.
 */
const GlobalScanOverlay: React.FC = () => {
  const [scanOverlay, setScanOverlay] = useState<'none' | 'goodbye' | 'already-exited'>('none');
  const [scanVisitorName, setScanVisitorName] = useState('');
  const scanPhoneRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissScanOverlay = () => {
    setScanOverlay('none');
    setScanVisitorName('');
    scanPhoneRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const handleQrScanned = (event: CustomEvent) => {
      const { parsed, result } = event.detail;
      const phone = parsed?.p || '';

      // Evitar processar scan duplicado enquanto overlay está visível
      if (scanPhoneRef.current === phone && scanOverlay !== 'none') return;
      scanPhoneRef.current = phone;

      if (result.type === 'EXIT') {
        setScanVisitorName(result.visit?.fullName || result.visit?.visitorName || parsed?.n || '');
        setScanOverlay('goodbye');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(dismissScanOverlay, 5000);
      } else if (result.type === 'ALREADY_EXITED') {
        setScanVisitorName(result.visit?.fullName || result.visit?.visitorName || parsed?.n || '');
        setScanOverlay('already-exited');
      }
    };

    window.addEventListener('qr-scanned', handleQrScanned as EventListener);
    return () => {
      window.removeEventListener('qr-scanned', handleQrScanned as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scanOverlay]);

  return (
    <>
      {/* QR Scanner USB — sempre ativo, invisível */}
      <QrKeyboardListener />

      {/* Overlay GOODBYE — saída com sucesso */}
      {scanOverlay === 'goodbye' && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm cursor-pointer select-none animate-fade-in"
          onClick={dismissScanOverlay}
        >
          {scanVisitorName && (
            <p className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{scanVisitorName}</p>
          )}
          <p className="text-xl md:text-2xl font-semibold text-[#0d3c22]">Saída registada com sucesso!</p>
          <p className="mt-10 text-gray-400 text-sm animate-pulse">Toque na tela para continuar</p>
        </div>
      )}

      {/* Overlay JÁ SAIU */}
      {scanOverlay === 'already-exited' && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm cursor-pointer select-none animate-fade-in"
          onClick={dismissScanOverlay}
        >
          <img src="/already-exited-birds.jpeg" alt="Já saiu" className="w-72 md:w-[480px] object-contain drop-shadow-xl" />
          <p className="mt-8 text-gray-400 text-sm animate-pulse">Toque na tela para continuar</p>
        </div>
      )}
    </>
  );
};

export default GlobalScanOverlay;
