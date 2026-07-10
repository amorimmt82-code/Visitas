import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitor } from '../context/VisitorContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { UI_LABELS } from '../constants';
import { Language } from '../types';
import { Printer, Home, Loader2, ClipboardCopy, Share2, Download, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { BadgeCard } from '../components/BadgeCard';

export const BadgeGeneration: React.FC = () => {
  const navigate = useNavigate();
  const { language, visitorData, updateVisitorData, resetVisitor, setShowSplash } = useVisitor();
  const labels = UI_LABELS[language];
  const badgeRef = useRef<HTMLDivElement>(null);

  const [shareStatus, setShareStatus] = useState<'idle' | 'generating' | 'copied' | 'downloaded' | 'shared'>('idle');


  const handlePrint = async () => {
    const api = (window as any).electronAPI;

    // Preferência: impressão direta em ZPL (Zebra GK420d), sem diálogo
    if (api?.printBadgeZpl) {
      try {
        const result = await api.printBadgeZpl(visitorData);
        if (result && result.ok) {
          return;
        }
        console.warn('[Print] ZPL falhou, a usar fallback:', result?.error);
      } catch (err) {
        console.warn('[Print] Exceção ZPL, a usar fallback:', err);
      }
    }

    // Fallback: impressão HTML (browser ou Electron sem ZPL)
    const printArea = document.getElementById('badge-print-area');
    if (printArea) {
      printArea.style.display = 'block';
    }

    await new Promise(r => setTimeout(r, 300));

    if (api?.printBadge) {
      await api.printBadge();
    } else {
      window.print();
    }

    if (printArea) {
      printArea.style.display = 'none';
    }
  };

  const generateBadgeBlob = async (): Promise<Blob | null> => {
    if (!badgeRef.current) return null;
    try {
      await document.fonts.ready;
      const h2c = (html2canvas as any).default || html2canvas;

      if (typeof h2c !== 'function') {
        console.error('html2canvas failed to load correctly', h2c);
        return null;
      }

      const canvas = await h2c(badgeRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        windowHeight: 800,
        imageTimeout: 15000,
      });

      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } catch (err) {
      console.error('Erro ao gerar imagem', err);
      return null;
    }
  };

  const handleShareOrEmail = async () => {
    let recipientEmail = visitorData.email || '';
    if (recipientEmail.trim() === '') {
      const manualEmail = window.prompt(language === Language.PT ? 'Qual o email de destino?' : 'Destination email?', '');
      if (manualEmail) {
        recipientEmail = manualEmail;
        updateVisitorData({ email: manualEmail });
      }
    }

    setShareStatus('generating');

    const blob = await generateBadgeBlob();
    if (!blob) {
      setShareStatus('idle');
      alert('Erro ao gerar imagem.');
      return;
    }

    const safeName = (visitorData.fullName || 'visitante')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20);

    const fileName = `Badge_${safeName}.png`;

    const file = new File([blob], fileName, { type: 'image/png', lastModified: Date.now() });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'O Melro - Visitor Pass',
          text: `Segue o crachá de ${visitorData.fullName}`,
          files: [file],
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 5000);
        return;
      } catch (err) {
        console.log('Compartilhamento nativo falhou ou foi cancelado pelo usuário. Tentando fallback.', err);
      }
    }

    let methodUsed: 'copied' | 'downloaded' = 'downloaded';

    try {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      methodUsed = 'copied';
      setShareStatus('copied');
    } catch (err) {
      console.warn('Clipboard bloqueado. Usando download forçado.', err);

      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        methodUsed = 'downloaded';
        setShareStatus('downloaded');
      } catch (e) {
        alert('Não foi possível processar a imagem.');
      }
    }

    const subject = language === Language.PT
      ? `Crachá - ${visitorData.fullName}`
      : `Badge - ${visitorData.fullName}`;

    let bodyInstruction = '';
    if (methodUsed === 'copied') {
      bodyInstruction = language === Language.PT
        ? '>>> COLE A IMAGEM AQUI (CTRL + V) <<<'
        : '>>> PASTE IMAGE HERE (CTRL + V) <<<';
    } else {
      bodyInstruction = language === Language.PT
        ? '(A imagem do crachá foi baixada/salva. Por favor, anexe-a aqui.)'
        : '(Badge image downloaded. Please attach it here.)';
    }

    const body = language === Language.PT
      ? `Olá,\n\n${bodyInstruction}\n\nVisitante: ${visitorData.fullName}\nEmpresa: ${visitorData.company}\n\nO Melro`
      : `Hello,\n\n${bodyInstruction}\n\nVisitor: ${visitorData.fullName}\nCompany: ${visitorData.company}\n\nO Melro`;

    setTimeout(() => {
      const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const a = document.createElement('a');
      a.href = mailtoLink;
      a.target = '_blank';
      a.click();

      setTimeout(() => setShareStatus('idle'), 12000);
    }, 800);
  };

  const handleFinish = () => {
    resetVisitor();
    navigate('/');
    setShowSplash(true);
  };

  return (
    <Layout showDate={false}>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #badge-print-area, #badge-print-area * {
            visibility: visible !important;
          }
          #badge-print-area {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 9cm !important;
            height: 6cm !important;
            background: white !important;
            z-index: 99999 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #badge-print-area .badge-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: scale(0.531) !important;
            transform-origin: top left !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 9cm 6cm;
            margin: 0;
          }
        }
      `}</style>

      <div className="w-full max-w-6xl animate-fade-in-up flex flex-col xl:flex-row items-center justify-center gap-12 xl:gap-24 no-print py-4">
        <div className="flex flex-col items-center">
          <div className="mb-6 flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
            <div className="w-2 h-2 rounded-full bg-melro-green animate-pulse"></div>
            Visualização de Impressão
          </div>
          <div className="transform transition-all duration-500 hover:scale-[1.02] hover:-rotate-1">
            <BadgeCard ref={badgeRef} visitor={visitorData} />
          </div>
        </div>

        <div className="flex flex-col items-center xl:items-start max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-800 mb-3 text-center xl:text-left">{labels.printTitle}</h2>
          <p className="text-gray-400 mb-10 text-center xl:text-left leading-relaxed">{labels.printSubtitle}</p>

          <div className="w-full space-y-4">
            <Button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-3 py-5 text-lg shadow-xl shadow-melro-green/20 active:scale-95 transition-transform"
            >
              <Printer size={20} />
              {labels.printBtn}
            </Button>

            <div className="w-full">
              <Button
                onClick={handleShareOrEmail}
                variant="outline"
                disabled={shareStatus === 'generating'}
                className={`w-full flex items-center justify-center gap-3 py-5 text-lg border-2 transition-all duration-300
                  ${shareStatus === 'copied' ? 'bg-melro-green/10 border-melro-green text-melro-green' : ''}
                  ${shareStatus === 'downloaded' ? 'bg-blue-50 border-blue-500 text-blue-600' : ''}
                  ${shareStatus === 'shared' ? 'bg-melro-green/10 border-melro-green text-melro-green' : ''}
                `}
              >
                {shareStatus === 'generating' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    ...
                  </>
                ) : shareStatus === 'shared' ? (
                  <>
                    <CheckCircle2 size={20} />
                    Compartilhado!
                  </>
                ) : shareStatus === 'copied' ? (
                  <>
                    <ClipboardCopy size={20} />
                    Copiado! Cole no Email
                  </>
                ) : shareStatus === 'downloaded' ? (
                  <>
                    <Download size={20} />
                    Baixado! Anexe no Email
                  </>
                ) : (
                  <>
                    <Share2 size={20} />
                    Compartilhar / Email
                  </>
                )}
              </Button>
            </div>

            {shareStatus === 'shared' && (
              <div className="bg-melro-green/5 border border-melro-green/20 rounded-lg p-4 text-sm text-melro-green leading-relaxed animate-fade-in text-left shadow-sm">
                <strong className="block mb-1 font-bold">✅ Enviado!</strong>
                O crachá foi enviado através do menu de compartilhamento.
              </div>
            )}

            {shareStatus === 'copied' && (
              <div className="bg-melro-green/5 border border-melro-green/20 rounded-lg p-4 text-sm text-melro-green leading-relaxed animate-fade-in text-left shadow-sm">
                <strong className="block mb-1 font-bold">✅ Imagem Copiada!</strong>
                O Outlook deve abrir em instantes. Clique no corpo do email e pressione <strong>Ctrl + V</strong> para colar.
              </div>
            )}

            {shareStatus === 'downloaded' && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 leading-relaxed animate-fade-in text-left shadow-sm">
                <strong className="block mb-1 text-blue-900">✅ Imagem Baixada!</strong>
                Ocorreu um erro ao enviar diretamente, então a imagem foi baixada.
                <strong>Arraste o arquivo baixado</strong> para dentro do email que abrirá em seguida.
              </div>
            )}

            <div className="pt-8 w-full">
              <Button
                onClick={handleFinish}
                variant="ghost"
                fullWidth
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-melro-dark text-sm uppercase tracking-wider"
              >
                <Home size={16} />
                {language === Language.PT ? 'Voltar ao Início' : language === Language.ES ? 'Volver al Inicio' : 'Back to Home'}
              </Button>
            </div>


          </div>
        </div>
      </div>

      <div id="badge-print-area" style={{ display: 'none' }}>
        <BadgeCard visitor={visitorData} />
      </div>

    </Layout>
  );
};
