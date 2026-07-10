
import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Visit } from '../types';
import { VisitRow } from '../components/VisitRow';
import { visitService } from '../services/visitService';
import { ArrowLeft, Filter, FileSpreadsheet, FileText, Loader2, X, User, Building2, Mail, Phone, LogIn, LogOut, FileSignature, UserCheck, Calendar, Glasses, Watch, Smartphone, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface HistoryProps {
  onBack: () => void;
}

type DateOrder = 'Recente' | 'Antigo';

export const History: React.FC<HistoryProps> = ({ onBack }) => {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Ref para comparação para evitar re-render desnecessário
  const prevVisitsRef = useRef<string>('');
  // Preserva a posição de scroll durante atualizações automáticas
  const pendingScrollRef = useRef<number | null>(null);
  
  const [filters, setFilters] = useState({
    name: '',
    company: 'Todas',
    reason: 'Todos',
    date: 'Todas'
  });

  const [dateOrder, setDateOrder] = useState<DateOrder>('Recente');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Função para carregar dados (reutilizável)
  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsUpdating(true);
    
    try {
        const data = await visitService.getAll();
        
        const currentStr = JSON.stringify(data);
        if (prevVisitsRef.current !== currentStr) {
            // Ao atualizar em segundo plano, memoriza o scroll para o restaurar
            if (silent) pendingScrollRef.current = window.scrollY;
            setAllVisits(data);
            prevVisitsRef.current = currentStr;
        }
    } catch (error) {
        console.error("Erro ao atualizar histórico", error);
    } finally {
        setLoading(false);
        setIsUpdating(false);
    }
  }, []);

  // Carregar dados na montagem
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Polling automático a cada 3 segundos (pausado enquanto uma linha está expandida)
  useEffect(() => {
    if (expandedId) return;
    const interval = setInterval(() => {
        fetchHistory(true); // Silent update
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchHistory, expandedId]);

  // Restaura a posição de scroll após atualizações automáticas (evita saltos)
  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null) {
        window.scrollTo(0, pendingScrollRef.current);
        pendingScrollRef.current = null;
    }
  }, [allVisits]);

  // Extrair opções de filtro dinamicamente com base nos dados reais
  const names = useMemo(() => Array.from(new Set(allVisits.map(v => v.visitorName).filter(Boolean))), [allVisits]);
  const companies = useMemo(() => Array.from(new Set(allVisits.map(v => v.company))), [allVisits]);
  const reasons = useMemo(() => Array.from(new Set(allVisits.map(v => v.reason))), [allVisits]);

  const filteredVisits = useMemo(() => {
    // Filtrar
    const nameTerm = filters.name.trim().toLowerCase();
    const filtered = allVisits.filter(visit => {
      const matchName = nameTerm === '' || (visit.visitorName || '').toLowerCase().includes(nameTerm);
      const matchCompany = filters.company === 'Todas' || visit.company === filters.company;
      const matchReason = filters.reason === 'Todos' || visit.reason === filters.reason;

      // Filtro de data simplificado
      let matchDate = true;
      if (filters.date === 'Hoje') {
         const today = new Date().toISOString().split('T')[0];
         matchDate = visit.date === today;
      } else if (filters.date === 'Esta Semana') {
          // Lógica simplificada de semana (apenas exemplo, ideal usar biblioteca de data)
          const today = new Date();
          const visitDate = new Date(visit.date);
          const diffTime = Math.abs(today.getTime() - visitDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          matchDate = diffDays <= 7;
      }
      return matchCompany && matchName && matchReason && matchDate;
    });

    // Agrupar por estado (em visita vs saído) e ordenar por data conforme dateOrder
    const compareDateDesc = (a: Visit, b: Visit) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      const tA = (a.entryTime || '00:00').replace(':', '');
      const tB = (b.entryTime || '00:00').replace(':', '');
      return parseInt(tB) - parseInt(tA);
    };
    const compareDateAsc = (a: Visit, b: Visit) => -compareDateDesc(a, b);
    const cmp = dateOrder === 'Recente' ? compareDateDesc : compareDateAsc;

    const activeVisits = filtered.filter(v => !v.exitTime).sort(cmp);
    const completedVisits = filtered.filter(v => v.exitTime).sort(cmp);

    // Retornar agrupados: ativos primeiro, depois completados
    return [...activeVisits, ...completedVisits];
  }, [filters, allVisits, dateOrder]);

  // Exportar para Excel com Formatação de Colunas
  const handleExportExcel = () => {
    // 1. Definir Cabeçalhos
    const headers = ["Data", "Nome do Visitante", "Empresa", "Telemóvel", "Email", "Entrada", "Saída", "Motivo da Visita", "Pessoa a visitar"];

    // 2. Preparar Dados (Array de Arrays é mais fácil para calcular larguras)
    const dataRows = filteredVisits.map(v => [
      v.date.split('-').reverse().join('/'),
      v.visitorName,
      v.company,
      v.phone || '--',
      v.email || '--',
      v.entryTime,
      v.exitTime || 'A Decorrer',
      v.reason,
      v.companion || '--'
    ]);

    // Unir Cabeçalho e Dados
    const worksheetData = [headers, ...dataRows];

    // 3. Criar a Worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // 4. Algoritmo de Auto-Fit (Calcular largura máxima por coluna)
    const colWidths = headers.map((header, i) => {
        // Começa com o tamanho do cabeçalho
        let maxLen = header.length;
        
        // Verifica todas as linhas dessa coluna
        dataRows.forEach(row => {
            const cellValue = row[i] ? String(row[i]) : "";
            if (cellValue.length > maxLen) {
                maxLen = cellValue.length;
            }
        });

        // Retorna a largura + um padding visual (aprox 2 caracteres)
        return { wch: maxLen + 4 };
    });

    // Aplicar as larguras calculadas à planilha
    ws['!cols'] = colWidths;

    // 5. Criar Workbook e Salvar
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico de Visitas");
    XLSX.writeFile(wb, `O_Melro_Visitas_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Exportar para PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cabeçalho
    doc.setFontSize(16);
    doc.setTextColor(13, 60, 34);
    doc.text("Relatório de Visitas - O Melro", 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 14, 20);
    doc.text(`Total: ${filteredVisits.length} visita(s)`, pageWidth - 14, 20, { align: 'right' });

    const tableColumn = ["Data", "Nome", "Empresa", "Telemóvel", "Email", "Entrada", "Saída", "Motivo", "Pessoa a visitar"];
    const tableRows: string[][] = filteredVisits.map(visit => [
      visit.date.split('-').reverse().join('/'),
      visit.visitorName,
      visit.company,
      visit.phone || '--',
      visit.email || '--',
      visit.entryTime,
      visit.exitTime || 'Decorrer',
      visit.reason,
      visit.companion || '--',
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 26,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [13, 60, 34], textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 245] },
      columnStyles: {
        0: { cellWidth: 22 },   // Data
        1: { cellWidth: 42 },   // Nome
        2: { cellWidth: 32 },   // Empresa
        3: { cellWidth: 24 },   // Telemóvel
        4: { cellWidth: 55 },   // Email
        5: { cellWidth: 18 },   // Entrada
        6: { cellWidth: 18 },   // Saída
        7: { cellWidth: 32 },   // Motivo
        8: { cellWidth: 38 },   // Pessoa a visitar
      },
      margin: { left: 8, right: 8 },
      didDrawPage: () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
      },
    });
    doc.save(`relatorio_visitas_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="w-full pt-4 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="bg-primary hover:bg-primaryHover text-white font-bold p-2.5 rounded-xl transition-colors shadow-md shadow-primary/20"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                {loading ? 'Carregando...' : `Histórico (${filteredVisits.length})`}
                {isUpdating && <Loader2 size={16} className="text-primary animate-spin ml-2" />}
            </h2>
         </div>
         
         <div className="flex gap-2">
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-white border border-green-700 text-green-800 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
               <FileSpreadsheet size={16} /> <span>Excel</span>
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-white border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
               <FileText size={16} /> <span>PDF</span>
            </button>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex items-center gap-2 text-gray-500 font-medium mb-4">
            <Filter size={18} />
            <span className="uppercase text-xs font-bold tracking-wider">Filtros</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
            {/* Name Filter */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Nome</label>
                <div className="relative">
                    <input
                      type="text"
                      list="nome-sugestoes"
                      placeholder="Pesquisar nome..."
                      className="w-full bg-white border border-primary rounded-full px-4 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={filters.name}
                      onChange={(e) => setFilters({...filters, name: e.target.value})}
                    />
                    <datalist id="nome-sugestoes">
                      {names.map(n => <option key={n} value={n} />)}
                    </datalist>
                </div>
            </div>
            {/* Company Filter */}
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Empresa</label>
               <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-primary rounded-full px-4 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    value={filters.company}
                    onChange={(e) => setFilters({...filters, company: e.target.value})}
                  >
                     <option>Todas</option>
                     {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
            </div>
           
            {/* Reason Filter */}
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Motivo</label>
               <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-primary rounded-full px-4 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    value={filters.reason}
                    onChange={(e) => setFilters({...filters, reason: e.target.value})}
                  >
                     <option>Todos</option>
                     {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Data</label>
               <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-primary rounded-full px-4 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  >
                     <option>Todas</option>
                     <option>Hoje</option>
                     <option>Esta Semana</option>
                  </select>
               </div>
            </div>

            {/* Ordenar (Recente / Antigo) */}
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Ordenar</label>
               <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-primary rounded-full px-4 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    value={dateOrder}
                    onChange={(e) => setDateOrder(e.target.value as DateOrder)}
                    title="Ordem por data"
                  >
                     <option value="Recente">Recente (descendente)</option>
                     <option value="Antigo">Antigo (crescente)</option>
                  </select>
               </div>
            </div>

            <div>
               <button 
                  onClick={() => fetchHistory(false)}
                  className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-2.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm shadow-primary/20"
               >
                  Pesquisar
               </button>
            </div>

         </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
             <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p>Carregando histórico...</p>
             </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Nome</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Empresa</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Telemóvel</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Email</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Entrada</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Saída</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Motivo</th>
                    <th className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Pessoa a visitar</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {filteredVisits.length > 0 ? (() => {
                    const COL_COUNT = 8;
                    const formatDateHeader = (iso: string) => {
                      const parts = iso.split('-');
                      if (parts.length !== 3) return iso;
                      const d = new Date(`${iso}T00:00:00`);
                      const weekday = d.toLocaleDateString('pt-PT', { weekday: 'long' });
                      const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                      return `${cap}, ${parts[2]}/${parts[1]}/${parts[0]}`;
                    };

                    const activeVisits = filteredVisits.filter(v => !v.exitTime);
                    const completedVisits = filteredVisits.filter(v => v.exitTime);

                    const groupByDate = (arr: Visit[]) => {
                      const groups: { date: string; items: Visit[] }[] = [];
                      const map = new Map<string, Visit[]>();
                      for (const v of arr) {
                        if (!map.has(v.date)) {
                          map.set(v.date, []);
                          groups.push({ date: v.date, items: map.get(v.date)! });
                        }
                        map.get(v.date)!.push(v);
                      }
                      return groups;
                    };

                    const renderSection = (title: string, items: Visit[], headerClass: string, badgeClass: string) => {
                      if (items.length === 0) return null;
                      const groups = groupByDate(items);
                      return (
                        <>
                          <tr className={headerClass}>
                            <td colSpan={COL_COUNT} className="py-3 px-4">
                              <span className={`text-xs font-bold uppercase tracking-wider ${badgeClass}`}>{title} ({items.length})</span>
                            </td>
                          </tr>
                          {groups.map(group => (
                            <React.Fragment key={`${title}-${group.date}`}>
                              <tr className="bg-slate-50 border-y border-slate-200">
                                <td colSpan={COL_COUNT} className="py-2 px-4">
                                  <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    <Calendar size={12} className="text-primary" />
                                    {formatDateHeader(group.date)}
                                    <span className="text-slate-400 font-normal normal-case tracking-normal">· {group.items.length} visita{group.items.length !== 1 ? 's' : ''}</span>
                                  </span>
                                </td>
                              </tr>
                              {group.items.map(visit => {
                                const isExpanded = expandedId === visit.id;
                                return (
                                  <React.Fragment key={visit.id}>
                                    <VisitRow
                                      visit={visit}
                                      isExpanded={isExpanded}
                                      onRowClick={(v) => setExpandedId(prev => prev === v.id ? null : v.id)}
                                    />
                                    {isExpanded && (
                                      <tr className="bg-primary/5">
                                        <td colSpan={COL_COUNT} className="p-0">
                                          <VisitDetailsPanel visit={visit} onClose={() => setExpandedId(null)} />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    };

                    return (
                      <>
                        {renderSection('🟢 Em Visita', activeVisits, 'bg-green-50/50', 'text-green-700')}
                        {renderSection('⭕ Saído', completedVisits, 'bg-gray-50/50', 'text-gray-600')}
                      </>
                    );
                  })() : (
                    <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                        Nenhuma visita encontrada.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        )}
      </div>

    </div>
  );
};

// =====================================================
// Painel expansível de detalhes da visita (inline na tabela)
// =====================================================
interface VisitDetailsPanelProps {
  visit: Visit;
  onClose: () => void;
}

const VisitDetailsPanel: React.FC<VisitDetailsPanelProps> = ({ visit, onClose }) => {
  const formatDate = (iso: string) => {
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const parsedObjects: Record<string, boolean> | null = (() => {
    if (!visit.objects) return null;
    try {
      return typeof visit.objects === 'string' ? JSON.parse(visit.objects) : (visit.objects as any);
    } catch {
      return null;
    }
  })();

  const objectLabels: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: 'glasses', label: 'Óculos', icon: <Glasses size={18} /> },
    { key: 'watch', label: 'Relógio', icon: <Watch size={18} /> },
    { key: 'phone', label: 'Telemóvel', icon: <Smartphone size={18} /> },
    { key: 'others', label: 'Outros', icon: <Package size={18} /> },
  ];

  const isActive = !visit.exitTime;

  return (
    <div className="mx-4 my-3 bg-white rounded-2xl shadow-md ring-1 ring-slate-900/5 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-primary to-primaryHover text-white">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/15 p-2.5 rounded-xl">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold leading-tight">{visit.visitorName}</h3>
              <p className="text-white/70 text-sm">{visit.company}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
            isActive ? 'bg-green-400/20 text-green-100 ring-1 ring-green-300/40' : 'bg-white/15 text-white/90 ring-1 ring-white/20'
          }`}>
            {isActive ? '🟢 Em Visita' : '⭕ Saído'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-2 rounded-full"
          aria-label="Fechar detalhes"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <DetailField icon={<Calendar size={16} />} label="Data" value={formatDate(visit.date)} />
          <DetailField icon={<Building2 size={16} />} label="Empresa" value={visit.company} />
          <DetailField icon={<Phone size={16} />} label="Telemóvel" value={visit.phone || '--'} mono />
          <DetailField icon={<Mail size={16} />} label="Email" value={visit.email || '--'} />
          <DetailField icon={<LogIn size={16} />} label="Entrada" value={visit.entryTime || '--'} mono />
          <DetailField
            icon={<LogOut size={16} />}
            label="Saída"
            value={visit.exitTime || 'A decorrer'}
            mono={!!visit.exitTime}
            highlight={!visit.exitTime}
          />
          <DetailField icon={<FileSignature size={16} />} label="Motivo da visita" value={visit.reason || '--'} />
          <DetailField icon={<UserCheck size={16} />} label="Pessoa a visitar" value={visit.companion || '--'} />
        </div>

        {/* Pertences pessoais */}
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package size={14} className="text-primary" />
            Pertences pessoais à entrada do armazém
          </h4>
          {parsedObjects ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {objectLabels.map(o => {
                const has = !!parsedObjects[o.key];
                return (
                  <div
                    key={o.key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                      has
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span className={has ? 'text-primary' : 'text-gray-300'}>{o.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight">{o.label}</p>
                      <p className="text-[11px] uppercase tracking-wider font-medium">
                        {has ? 'Sim' : 'Não'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic bg-gray-50 rounded-xl px-4 py-3 border border-dashed border-gray-200">
              Sem registo de pertences pessoais para esta visita.
            </div>
          )}
        </div>

        {/* ID da visita (técnico) */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">ID</p>
          <p className="text-xs font-mono text-gray-500 break-all">{visit.id}</p>
        </div>
      </div>
    </div>
  );
};

interface DetailFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}

const DetailField: React.FC<DetailFieldProps> = ({ icon, label, value, mono, highlight }) => (
  <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1 flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      {label}
    </p>
    <p className={`text-sm font-bold text-gray-800 break-words ${mono ? 'font-mono' : ''} ${highlight ? 'text-primary' : ''}`}>
      {value}
    </p>
  </div>
);

export default History;
