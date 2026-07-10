import React, { useState, useRef } from 'react';
import { Logo } from './Logo';
import { Apple, Cherry, ChevronRight, Printer, Loader2, X } from 'lucide-react';

import { BadgeCard } from './BadgeCard';
import { VisitRecord } from '../types';
import { apiFetch } from '../services/api';

// Interface for visit data from API
interface Visit {
  id: string;
  visitorName: string;
  company: string;
  entryTime: string;
  exitTime: string | null;
  date: string;
  reason: string;
  email: string;
  phone: string;
  companion: string;
}

// Custom Pear Icon to match Lucide style
const Pear = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22c4.4 0 8-3.6 8-8 0-4-3-8-8-12C7 6 4 10 4 14c0 4.4 3.6 8 8 8z" />
    <path d="M12 2v2" />
    <path d="M14 2a2 2 0 0 1 2 2" />
  </svg>
);

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [selectedVisits, setSelectedVisits] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Ignore clicks on the reprint button
    if ((e.target as HTMLElement).closest('.reprint-button')) return;
    if (isExiting || isReprintModalOpen) return;
    
    setIsExiting(true);
    
    setTimeout(() => {
      onFinish();
    }, 600);
  };

  const handleReprintClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReprintModalOpen(true);
    setIsLoading(true);
    
    try {
      const response = await apiFetch('/api/visits');
      const result = await response.json();
      const visits = result.data || [];
      // Filter only active visits (no exitTime)
      const active = visits.filter((v: Visit) => !v.exitTime);
      setActiveVisits(active);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setActiveVisits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedVisits);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedVisits(newSet);
  };

  const handlePrintLabels = async () => {
    setIsPrinting(true);
    const api = (window as any).electronAPI;
    const selected = activeVisits.filter(v => selectedVisits.has(v.id));

    try {
      if (api?.printBadgeZpl) {
        // Impressão direta em ZPL para cada etiqueta selecionada (sem diálogo)
        let allOk = true;
        for (const visit of selected) {
          const visitorPayload = {
            fullName: visit.visitorName,
            email: visit.email,
            company: visit.company,
            phone: visit.phone,
            visitReason: visit.reason,
          };
          try {
            const result = await api.printBadgeZpl(visitorPayload);
            if (!result || !result.ok) {
              allOk = false;
              console.warn('[Reprint] ZPL falhou para', visit.visitorName, result?.error);
            }
          } catch (err) {
            allOk = false;
            console.warn('[Reprint] Exceção ZPL:', err);
          }
        }
        if (allOk) {
          setIsPrinting(false);
          setSelectedVisits(new Set());
          setIsReprintModalOpen(false);
          return;
        }
      }

      // Fallback: impressão HTML (browser ou se ZPL falhar)
      await new Promise(r => setTimeout(r, 100));
      if (printAreaRef.current) {
        if (api?.printBadge) {
          await api.printBadge();
        } else {
          const scrollY = window.scrollY;
          window.print();
          window.scrollTo(0, scrollY);
        }
      }
    } finally {
      setIsPrinting(false);
      setSelectedVisits(new Set());
      setIsReprintModalOpen(false);
    }
  };

  const closeModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReprintModalOpen(false);
    setSelectedVisits(new Set());
  };

  return (
    <div 
      onClick={handleClick}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white cursor-pointer overflow-hidden transition-all duration-700 ease-in-out ${isExiting ? 'opacity-0 scale-105 filter blur-sm' : 'opacity-100 scale-100'}`}
    >
      {/* Background Gradient Spotlights */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#0d3c22] rounded-full blur-[100px] opacity-10"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[100px] opacity-60"></div>
      </div>

      <div className="relative flex flex-col items-center z-10 animate-fade-in">
        
        {/* Logo Area with subtle drop shadow */}
        <div className="animate-slide-up relative drop-shadow-xl mb-16 transition-transform duration-500 hover:scale-105">
            <Logo size={320} />
        </div>
        
        {/* Loading / Attraction Area - Glassmorphism Container */}
        <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d3c22]/20 to-teal-200 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative bg-white/80 backdrop-blur-md border border-white/50 shadow-lg px-10 py-6 rounded-full flex gap-10 items-center">
                
                {/* Floating Fruits with staggered animation */}
                <div className="animate-float" style={{ animationDelay: '0s' }}>
                    <Apple size={28} className="text-gray-400 group-hover:text-red-400 transition-colors duration-500" />
                </div>
                <div className="animate-float" style={{ animationDelay: '0.2s' }}>
                    <Cherry size={36} className="text-melro-green drop-shadow-md group-hover:text-red-600 transition-colors duration-500" />
                </div>
                <div className="animate-float" style={{ animationDelay: '0.4s' }}>
                    {/* Substituída Banana por Pear (Pêra) */}
                    <Pear size={28} className="text-gray-400 group-hover:text-lime-500 transition-colors duration-500" />
                </div>

            </div>
        </div>

        {/* Action Text */}
        <div className="absolute -bottom-32 flex items-center gap-2 opacity-60">
            <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em] animate-shimmer">
                Toque para iniciar
            </p>
            <ChevronRight size={14} className="text-gray-300 animate-pulse" />
        </div>

      </div>

      {/* Re-imprimir Button - Bottom Right Corner */}
      <button
        onClick={handleReprintClick}
        className="reprint-button fixed bottom-8 right-8 z-[110] bg-[#0d3c22] hover:bg-[#0a2e1a] text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-[#0d3c22]/30 flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm"
      >
        <Printer size={20} />
        Re-imprimir
      </button>

      {/* Reprint Modal */}
      {isReprintModalOpen && (
        <>
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={closeModal}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in ring-1 ring-slate-900/5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <Printer size={24} className="text-[#0d3c22]" />
                  Re-imprimir Etiqueta
                </h3>
                <button 
                  onClick={closeModal} 
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto bg-white">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={32} className="animate-spin text-[#0d3c22]" />
                    <p className="text-gray-500">A carregar visitas...</p>
                  </div>
                ) : activeVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 italic">Não há visitas ativas para reimprimir.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-4">Selecione as visitas que deseja reimprimir:</p>
                    {activeVisits.map(visit => (
                      <div 
                        key={visit.id}
                        onClick={() => toggleSelection(visit.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedVisits.has(visit.id) 
                            ? 'border-[#0d3c22] bg-[#0d3c22]/5' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedVisits.has(visit.id) 
                                ? 'border-[#0d3c22] bg-[#0d3c22]' 
                                : 'border-gray-300'
                            }`}>
                              {selectedVisits.has(visit.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{visit.visitorName}</p>
                              <p className="text-sm text-gray-500">{visit.company}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              A Decorrer
                            </span>
                            <p className="text-xs text-gray-400 mt-1">Entrada: {visit.entryTime}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={closeModal} 
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-3 rounded-xl uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePrintLabels} 
                  disabled={selectedVisits.size === 0 || isPrinting}
                  className={`flex-1 font-bold py-3 rounded-xl uppercase text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                    selectedVisits.size > 0 && !isPrinting
                      ? 'bg-[#0d3c22] hover:bg-[#0a2e1a] shadow-[#0d3c22]/20' 
                      : 'bg-gray-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isPrinting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      A imprimir...
                    </>
                  ) : (
                    <>
                      <Printer size={18} />
                      Imprimir ({selectedVisits.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          {/* Hidden print area for selected badges */}
          <div className="reprint-print-area" ref={printAreaRef}>
            {activeVisits.filter(v => selectedVisits.has(v.id)).map((visit) => {
              const badgeVisitor: VisitRecord = {
                id: visit.id,
                email: visit.email,
                fullName: visit.visitorName,
                phone: visit.phone,
                company: visit.company,
                companion: visit.companion,
                objects: { glasses: false, watch: false, phone: false, others: false },
                visitReason: visit.reason,
                acceptedRules: true,
                checkIn: visit.entryTime,
                checkOut: visit.exitTime,
                status: visit.exitTime ? 'completed' : 'active',
              };
              return (
                <div key={visit.id} className="print-badge" style={{ pageBreakAfter: 'always', margin: 0, padding: 0 }}>
                  <BadgeCard visitor={badgeVisitor} />
                </div>
              );
            })}
          </div>
          {/* Print styles for badge layout */}
          <style>{`
            .reprint-print-area {
              position: fixed;
              left: -9999px;
              top: 0;
            }
            @media print {
              body * {
                visibility: hidden !important;
              }
              .reprint-print-area,
              .reprint-print-area * {
                visibility: visible !important;
              }
              .reprint-print-area {
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
              .reprint-print-area .badge-container {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                transform: scale(0.531) !important;
                transform-origin: top left !important;
              }
              .print-badge {
                margin: 0 !important;
                padding: 0 !important;
                page-break-after: always;
              }
              @page { size: 9cm 6cm; margin: 0; }
            }
          `}</style>
        </>
      )}
    </div>
  );
};