import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ArrowLeft, CheckCircle, LogOut, AlertTriangle } from 'lucide-react';
import { visitService } from '../services/visitService';


interface ScanProps {
  onBack: () => void;
}

export const Scan: React.FC<ScanProps> = ({ onBack }) => {
  const [lastResult, setLastResult] = useState<{ type: string, message: string, visitor?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Evitar renderização dupla do scanner em Strict Mode
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const processedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
  // Previne dupla inicialização (React Strict Mode chama useEffect duas vezes)
  if (mountedRef.current) return;
  mountedRef.current = true;

  // Limpa qualquer conteúdo leftover no container antes de inicializar
  const readerEl = document.getElementById('reader');
  if (readerEl) readerEl.innerHTML = '';

  // Limpa scanner anterior se existir (ex: navegação rápida)
  if (scannerRef.current) {
    try { scannerRef.current.clear(); } catch (_) { /* ignore */ }
    scannerRef.current = null;
  }

  scannerRef.current = new Html5QrcodeScanner(
    "reader",
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      rememberLastUsedCamera: true,
    },
    false
  );

  scannerRef.current.render(onScanSuccess, onScanFailure);

  // === SCANNER DE TECLADO (ZEBRA, MODO HID) ===
  let buffer = "";
  let timeout: NodeJS.Timeout;

  const handleKeyDown = (e: KeyboardEvent) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => (buffer = ""), 500); // reseta se demorar

    if (e.key === "Enter") {
      const scannedText = buffer.trim();
      if (scannedText) {
        onScanSuccess(scannedText, null); // chama o mesmo processo
        buffer = "";
      }
    } else {
      buffer += e.key;
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    // Cleanup
    mountedRef.current = false;
    window.removeEventListener("keydown", handleKeyDown);
    if (scannerRef.current) {
      scannerRef.current.clear().catch((err: any) => console.error("Failed to clear scanner", err));
      scannerRef.current = null;
    }
    // Garante que o container fica limpo
    const el = document.getElementById('reader');
    if (el) el.innerHTML = '';
  };
}, []);


  const onScanSuccess = async (decodedText: string, _decodedResult: any) => {
      // Debounce simples para evitar multiplas leituras seguidas
      if (isProcessing || processedRef.current) return;
      
      setIsProcessing(true);
      processedRef.current = true;
      
      // Pausar scanner visualmente (opcional, na prática o Html5QrcodeScanner continua rodando)
      // Processar
      const result = await visitService.processQrScan(decodedText);
      
      setLastResult({
          type: result.type,
          message: result.message,
          visitor: result.visit?.visitorName
      });

      // Reset para permitir nova leitura após 3 segundos
      setTimeout(() => {
          setIsProcessing(false);
          processedRef.current = false;
          setLastResult(null);
      }, 3000);
  };

  const onScanFailure = (_error: any) => {
      // Ignorar erros de "não encontrou QR code neste frame"
  };

  return (
    <div className="w-full pt-4 space-y-8 flex flex-col items-center max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="w-full flex items-center gap-4">
        <button 
            onClick={onBack}
            className="bg-primary hover:bg-primaryHover text-white font-bold p-2.5 rounded-xl transition-colors shadow-md shadow-primary/20"
        >
            <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide">Ler QR Code</h2>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
          
          {/* Feedback Overlay */}
          {lastResult && (
              <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm animate-scale-in`}>
                  {lastResult.type === 'ENTRY' && <CheckCircle className="text-primary w-24 h-24 mb-4" />}
                  {lastResult.type === 'EXIT' && <LogOut className="text-blue-500 w-24 h-24 mb-4" />}
                  {lastResult.type === 'ERROR' && <AlertTriangle className="text-red-500 w-24 h-24 mb-4" />}
                  
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{lastResult.visitor}</h3>
                  <p className={`text-lg font-medium px-6 py-2 rounded-full ${
                      lastResult.type === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                      {lastResult.message}
                  </p>
                  <p className="mt-8 text-gray-400 text-sm animate-pulse">A preparar próxima leitura...</p>
              </div>
          )}

          <div className="p-6">
            <div id="reader" className="overflow-hidden rounded-xl border-2 border-dashed border-gray-300"></div>
          </div>
          
          <div className="px-6 pb-6 text-center">
              <p className="text-gray-500 text-sm">
                  Aponte a câmara para o crachá do visitante. 
                  <br/>
                  O sistema deteta automaticamente <strong>Entrada</strong> ou <strong>Saída</strong>.
              </p>
          </div>
      </div>

    </div>
  );
};