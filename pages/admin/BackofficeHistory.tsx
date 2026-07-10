import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { BackofficeVisitRow } from './BackofficeVisitRow';
import { visitService } from '../../o-melro-backoffice teste (1)/services/visitService';
import { ArrowLeft, Filter, FileSpreadsheet, FileText, Loader2, ArrowUp, ArrowDown, ArrowUpDown, X, Search, User, Building2, Mail, Phone, Clock, LogIn, LogOut, FileSignature, UserCheck, Calendar, Glasses, Watch, Smartphone, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortKey = 'visitorName' | 'company' | 'phone' | 'email' | 'entryTime' | 'exitTime' | 'reason' | 'companion';
type SortDir = 'asc' | 'desc';

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
  objects?: string | null;
}

interface HistoryProps {
  onBack: () => void;
}

export const BackofficeHistory: React.FC<HistoryProps> = ({ onBack }) => {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const prevVisitsRef = useRef<string>('');
  const pendingScrollRef = useRef<number | null>(null);
  
  const [filters, setFilters] = useState({
    name: '',
    company: 'Todas',
    reason: 'Todos',
    date: 'Todas'
  });

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortVisits = useCallback((arr: Visit[]): Visit[] => {
    if (!sortKey) return arr;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
      const va = (a as any)[sortKey] ?? '';
      const vb = (b as any)[sortKey] ?? '';
      if (sortKey === 'entryTime' || sortKey === 'exitTime') {
        const na = va ? parseInt(String(va).replace(':', '')) : -1;
        const nb = vb ? parseInt(String(vb).replace(':', '')) : -1;
        return (na - nb) * dir;
      }
      return String(va).localeCompare(String(vb), 'pt', { sensitivity: 'base' }) * dir;
    });
  }, [sortKey, sortDir]);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsUpdating(true);
    
    try {
        const data = await visitService.getAll();
        
        const currentStr = JSON.stringify(data);
        if (prevVisitsRef.current !== currentStr) {
            // Preserva a posição de scroll quando a atualização é automática (em segundo plano)
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

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Polling automático a cada 3 segundos (pausado enquanto o modal de detalhes está aberto)
  useEffect(() => {
    if (selectedVisit) return;
    const interval = setInterval(() => {
        fetchHistory(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchHistory, selectedVisit]);

  // Restaura a posição de scroll após atualizações automáticas, evitando o salto para o topo
  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null) {
        window.scrollTo(0, pendingScrollRef.current);
        pendingScrollRef.current = null;
    }
  }, [allVisits]);

  const names = useMemo(() => Array.from(new Set(allVisits.map(v => v.visitorName))), [allVisits]);
  const companies = useMemo(() => Array.from(new Set(allVisits.map(v => v.company))), [allVisits]);
  const reasons = useMemo(() => Array.from(new Set(allVisits.map(v => v.reason))), [allVisits]);

  const filteredVisits = useMemo(() => {
    const nameTerm = filters.name.trim().toLowerCase();
    const filtered = allVisits.filter(visit => {
      const matchName = nameTerm === '' || (visit.visitorName || '').toLowerCase().includes(nameTerm);
      const matchCompany = filters.company === 'Todas' || visit.company === filters.company;
      const matchReason = filters.reason === 'Todos' || visit.reason === filters.reason;

      let matchDate = true;
      if (filters.date === 'Hoje') {
         const today = new Date().toISOString().split('T')[0];
         matchDate = visit.date === today;
      } else if (filters.date === 'Esta Semana') {
          const today = new Date();
          const visitDate = new Date(visit.date);
          const diffTime = Math.abs(today.getTime() - visitDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          matchDate = diffDays <= 7;
      }
      return matchName && matchCompany && matchReason && matchDate;
    });

    const activeVisits = filtered.filter(v => !v.exitTime);
    const completedVisits = filtered.filter(v => v.exitTime);

    if (sortKey) {
      return [...sortVisits(activeVisits), ...sortVisits(completedVisits)];
    }

    const activeSorted = [...activeVisits].sort((a, b) => {
      const timeA = a.entryTime ? parseInt(a.entryTime.replace(':', '')) : 0;
      const timeB = b.entryTime ? parseInt(b.entryTime.replace(':', '')) : 0;
      return timeB - timeA;
    });
    const completedSorted = [...completedVisits].sort((a, b) => {
      const timeA = a.exitTime ? parseInt(a.exitTime.replace(':', '')) : 0;
      const timeB = b.exitTime ? parseInt(b.exitTime.replace(':', '')) : 0;
      return timeB - timeA;
    });

    return [...activeSorted, ...completedSorted];
  }, [filters, allVisits, sortKey, sortVisits]);

  // Exportar para Excel
  const handleExportExcel = () => {
    const headers = ["Data", "Nome do Visitante", "Empresa", "Telemóvel", "Email", "Entrada", "Saída", "Motivo da Visita", "Pessoa a visitar"];

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

    const worksheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    const colWidths = headers.map((header, i) => {
        let maxLen = header.length;
        dataRows.forEach(row => {
            const cellValue = row[i] ? String(row[i]) : "";
            if (cellValue.length > maxLen) {
                maxLen = cellValue.length;
            }
        });
        return { wch: maxLen + 4 };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico de Visitas");
    XLSX.writeFile(wb, `O_Melro_Visitas_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Exportar para PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

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
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [13, 60, 34], textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 245] },
      columnStyles: {
        0: { cellWidth: 20 },  // Data
        1: { cellWidth: 45 },  // Nome
        2: { cellWidth: 30 },  // Empresa
        3: { cellWidth: 22 },  // Telemóvel
        4: { cellWidth: 55 },  // Email
        5: { cellWidth: 17 },  // Entrada
        6: { cellWidth: 17 },  // Saída
        7: { cellWidth: 30 },  // Motivo
        8: { cellWidth: 35 },  // Pessoa a visitar
      },
      margin: { left: 8, right: 8 },
      didDrawPage: (_data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
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
              className="bg-[#0d3c22] hover:bg-[#0a2e1a] text-white font-bold p-2.5 rounded-xl transition-colors shadow-md shadow-[#0d3c22]/20"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                {loading ? 'Carregando...' : `Histórico (${filteredVisits.length})`}
                {isUpdating && <Loader2 size={16} className="text-[#0d3c22] animate-spin ml-2" />}
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
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Nome</label>
            <div className="relative">
              <input
                type="text"
                list="nome-suggestions"
                placeholder="Pesquisar nome..."
                className="w-full bg-white border border-[#0d3c22] rounded-full px-4 py-2.5 pr-10 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0d3c22] focus:border-transparent"
                value={filters.name}
                onChange={(e) => setFilters({...filters, name: e.target.value})}
              />
              <datalist id="nome-suggestions">
                {names.map(n => <option key={n} value={n} />)}
              </datalist>
              {filters.name ? (
                <button
                  type="button"
                  onClick={() => setFilters({...filters, name: ''})}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-[#0d3c22] transition-colors"
                  title="Limpar"
                >
                  <X size={16} />
                </button>
              ) : (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  <Search size={16} />
                </div>
              )}
            </div>
          </div>
            
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Empresa</label>
               <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-[#0d3c22] rounded-full px-4 py-2.5 pr-10 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0d3c22] focus:border-transparent cursor-pointer"
                    value={filters.company}
                    onChange={(e) => setFilters({...filters, company: e.target.value})}
                  >
                     <option>Todas</option>
                     {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Motivo</label>
               <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-[#0d3c22] rounded-full px-4 py-2.5 pr-10 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0d3c22] focus:border-transparent cursor-pointer"
                    value={filters.reason}
                    onChange={(e) => setFilters({...filters, reason: e.target.value})}
                  >
                     <option>Todos</option>
                     {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-wide ml-1">Data</label>
               <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-[#0d3c22] rounded-full px-4 py-2.5 pr-10 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0d3c22] focus:border-transparent cursor-pointer"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  >
                     <option>Todas</option>
                     <option>Hoje</option>
                     <option>Esta Semana</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
               </div>
            </div>

            <div>
               <button 
                  onClick={() => fetchHistory(true)}
                  className="w-full bg-[#0d3c22] hover:bg-[#0a2e1a] text-white font-bold py-2.5 rounded-full uppercase tracking-wider transition-colors shadow-sm shadow-[#0d3c22]/20"
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
                <Loader2 size={32} className="animate-spin text-[#0d3c22]" />
                <p>Carregando histórico...</p>
             </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full">
                <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                    {([
                      { key: 'visitorName', label: 'Nome' },
                      { key: 'company', label: 'Empresa' },
                      { key: 'phone', label: 'Telemóvel' },
                      { key: 'email', label: 'Email' },
                      { key: 'entryTime', label: 'Entrada' },
                      { key: 'exitTime', label: 'Saída' },
                      { key: 'reason', label: 'Motivo' },
                      { key: 'companion', label: 'Pessoa a visitar' },
                    ] as { key: SortKey; label: string }[]).map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="py-4 px-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                        title="Clique para ordenar"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === 'asc'
                              ? <ArrowUp size={12} className="text-[#0d3c22]" />
                              : <ArrowDown size={12} className="text-[#0d3c22]" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                      </th>
                    ))}
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

                    // Agrupa por data preservando a ordem actual
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
                              <tr className="bg-[#0d3c22] border-y border-[#0a2e1a]">
                                <td colSpan={COL_COUNT} className="py-2.5 px-4">
                                  <span className="inline-flex items-center gap-2 text-[11px] font-extrabold text-white uppercase tracking-wider">
                                    <Calendar size={12} className="text-white" />
                                    {formatDateHeader(group.date)}
                                    <span className="text-white/70 font-medium normal-case tracking-normal">· {group.items.length} visita{group.items.length !== 1 ? 's' : ''}</span>
                                  </span>
                                </td>
                              </tr>
                              {group.items.map(visit => (
                                <BackofficeVisitRow
                                  key={visit.id}
                                  visit={visit}
                                  onRowClick={(v) => setSelectedVisit(v as Visit)}
                                />
                              ))}
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

      {selectedVisit && (
        <VisitDetailsModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
      )}

    </div>
  );
};

// =====================================================
// Modal de detalhes da visita
// =====================================================
interface VisitDetailsModalProps {
  visit: Visit;
  onClose: () => void;
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({ visit, onClose }) => {
  const formatDate = (iso: string) => {
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const parsedObjects: Record<string, boolean> | null = (() => {
    if (!visit.objects) return null;
    try {
      return typeof visit.objects === 'string' ? JSON.parse(visit.objects) : visit.objects;
    } catch {
      return null;
    }
  })();

  const objectLabels: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: 'glasses', label: 'Óculos', icon: <Glasses size={18} /> },
    { key: 'clock', label: 'Relógio', icon: <Clock size={18} /> },
    { key: 'watch', label: 'Relógio', icon: <Watch size={18} /> },
    { key: 'phone', label: 'Telemóvel', icon: <Smartphone size={18} /> },
    { key: 'others', label: 'Outros', icon: <Package size={18} /> },
  ];

  const isActive = !visit.exitTime;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-in ring-1 ring-slate-900/5 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-[#0d3c22] to-[#0a2e1a] text-white">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/15 p-2.5 rounded-xl">
                <User size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">{visit.visitorName}</h3>
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
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Grelha de informações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Package size={14} className="text-[#0d3c22]" />
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
                          ? 'border-[#0d3c22] bg-[#0d3c22]/5 text-[#0d3c22]'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span className={has ? 'text-[#0d3c22]' : 'text-gray-300'}>{o.icon}</span>
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
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">ID</p>
            <p className="text-xs font-mono text-gray-500 break-all">{visit.id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#0d3c22] hover:bg-[#0a2e1a] text-white font-bold px-6 py-2.5 rounded-xl uppercase tracking-wider text-sm transition-colors"
          >
            Fechar
          </button>
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
      <span className="text-[#0d3c22]">{icon}</span>
      {label}
    </p>
    <p className={`text-sm font-bold text-gray-800 break-words ${mono ? 'font-mono' : ''} ${highlight ? 'text-[#0d3c22]' : ''}`}>
      {value}
    </p>
  </div>
);
