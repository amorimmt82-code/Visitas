
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { VisitRow } from '../components/VisitRow';
import { DashboardStats, Visit } from '../types';
import { visitService } from '../services/visitService';
import { RefreshCcw, LogOut } from 'lucide-react';


interface DashboardProps {
  onNavigateHistory: () => void;
  onNavigateScan?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateHistory, onNavigateScan }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ activeVisits: 0, totalToday: 0, totalWeek: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [selectedExitVisits, setSelectedExitVisits] = useState<Set<string>>(new Set());
  const [isProcessingExit, setIsProcessingExit] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref para comparação de dados e evitar re-render desnecessário
  const prevVisitsStr = useRef('');

  // Função de carregamento isolada para reutilização
  const loadData = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) setIsRefreshing(true);
    try {
      const [data, statistics] = await Promise.all([
        visitService.getAll(),
        visitService.getStats()
      ]);

      // Otimização: Só atualiza o estado se os dados realmente mudaram
      const currentVisitsStr = JSON.stringify(data);
      if (prevVisitsStr.current !== currentVisitsStr) {
          setVisits(data);
          prevVisitsStr.current = currentVisitsStr;
      }
      
      // Stats são leves, podem atualizar sempre
      setStats(statistics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Falha ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-Refresh a cada 3 segundos (Quase Tempo Real)
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData(false); // Atualiza silenciosamente sem spinner full-screen
    }, 3000); 

    return () => clearInterval(intervalId);
  }, [loadData]);

  const recentVisits = visits.slice(0, 5); // Take first 5

  const toggleExitSelection = (id: string) => {
    const newSet = new Set(selectedExitVisits);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedExitVisits(newSet);
  };

  const handleConfirmExit = async () => {
    if (selectedExitVisits.size === 0) return;
    setIsProcessingExit(true);
    try {
      const promises = Array.from(selectedExitVisits).map(id => visitService.checkOut(id));
      await Promise.all(promises);
      setSelectedExitVisits(new Set());
      setIsExitModalOpen(false);
      loadData(true);
    } catch (err) {
      console.error('Erro ao registar saída:', err);
      alert('Erro ao registar saída. Tente novamente.');
    } finally {
      setIsProcessingExit(false);
    }
  };



  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-primary font-bold tracking-widest text-xs uppercase">A Sincronizar dados...</p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 pb-12">
      {/* Left Column: Stats */}
      <div className="lg:col-span-5 space-y-6 animate-fade-in-up [animation-delay:100ms]">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-8 bg-primary rounded-full inline-block"></span>
                Dashboard
            </h2>
            <button 
                onClick={() => loadData(true)}
                className={`p-2 rounded-full hover:bg-gray-100 transition-all text-gray-400 hover:text-primary ${isRefreshing ? 'animate-spin text-primary' : ''}`}
                title="Atualizar dados"
            >
                <RefreshCcw size={20} />
            </button>
        </div>
        
        {/* Active Visits Card */}
        <div className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[180px] hover:shadow-md hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor" className="text-primary"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <span className="text-6xl font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">{stats.activeVisits}</span>
          <span className="text-gray-500 font-medium uppercase tracking-wider text-sm">visitas a decorrer</span>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[140px] hover:shadow-md transition-all duration-300">
            <span className="text-3xl font-bold text-gray-800 mb-2">{stats.totalToday}</span>
            <span className="text-gray-500 text-center text-xs font-bold uppercase tracking-wide leading-tight">visitas hoje</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[140px] hover:shadow-md transition-all duration-300">
            <span className="text-3xl font-bold text-gray-800 mb-2">{stats.totalWeek}</span>
            <span className="text-gray-500 text-center text-xs font-bold uppercase tracking-wide leading-tight">visitas semana</span>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 font-mono">
            Última atualização: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>

      {/* Right Column: Recent Activity */}
      <div className="lg:col-span-7 space-y-6 animate-fade-in-up [animation-delay:300ms]">
         <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-8 bg-slate-300 rounded-full inline-block"></span>
            Últimas Visitas
         </h2>
         
         <div className="space-y-3">
            {recentVisits.map((visit, index) => (
              <div key={visit.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-up">
                  <VisitRow visit={visit} isDashboard />
              </div>
            ))}
            {recentVisits.length === 0 && (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                    Sem visitas recentes registadas.
                </div>
            )}
         </div>

         <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={onNavigateHistory}
              className="flex-1 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold py-3 px-6 rounded-xl uppercase text-sm tracking-wider transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Ver Todas
            </button>
            {onNavigateScan && (
              <button
                onClick={() => { setSelectedExitVisits(new Set()); setIsExitModalOpen(true); }}
                className="flex-1 bg-primary border-2 border-primary text-white hover:bg-primaryHover font-bold py-3 px-6 rounded-xl uppercase text-sm tracking-wider transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Validar Saída
              </button>
            )}
         </div>
      </div>

      {/* Exit Validation Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/5 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in ring-1 ring-slate-900/5">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <LogOut size={20} className="text-primary" />
                 Validar Saída
               </h3>
               <button onClick={() => setIsExitModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors text-2xl">&times;</button>
            </div>
            
            <div className="p-4 bg-primary/5 border-b border-primary/10">
              <p className="text-sm text-gray-600 text-center">Selecione os visitantes que pretende registar a saída</p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto bg-white space-y-2">
               {visits.filter(v => !v.exitTime).map(visit => (
                  <VisitRow 
                    key={visit.id} 
                    visit={visit} 
                    isDashboard 
                    onSelect={toggleExitSelection} 
                    isSelected={selectedExitVisits.has(visit.id)}
                  />
               ))}
               {visits.filter(v => !v.exitTime).length === 0 && (
                   <p className="text-center text-gray-500 py-8 italic">Não há visitas a decorrer de momento.</p>
               )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
               <button 
                 onClick={() => setIsExitModalOpen(false)} 
                 className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-3 rounded-xl uppercase transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleConfirmExit} 
                 disabled={selectedExitVisits.size === 0 || isProcessingExit} 
                 className={`flex-1 font-bold py-3 rounded-xl uppercase text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                   selectedExitVisits.size > 0 && !isProcessingExit
                     ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                     : 'bg-gray-300 cursor-not-allowed shadow-none'
                 }`}
               >
                 {isProcessingExit ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     A processar...
                   </>
                 ) : (
                   <>
                     <LogOut size={16} />
                     Confirmar Saída ({selectedExitVisits.size})
                   </>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
