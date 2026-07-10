import React from 'react';
import { ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react';

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

interface VisitRowProps {
  visit: Visit;
  isDashboard?: boolean;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  onRowClick?: (visit: Visit) => void;
}

export const BackofficeVisitRow: React.FC<VisitRowProps> = ({ visit, isDashboard = false, onSelect, isSelected, onRowClick }) => {
  if (isDashboard) {
    return (
      <div 
        onClick={() => {
          if (onSelect) return onSelect(visit.id);
          if (onRowClick) return onRowClick(visit);
        }}
        className={`group flex items-center justify-between p-4 bg-white border rounded-xl transition-all duration-200 ${
          (onSelect || onRowClick) ? 'cursor-pointer' : ''
        } ${
          isSelected 
            ? 'border-[#0d3c22] ring-1 ring-[#0d3c22] shadow-md' 
            : 'border-slate-100 hover:border-[#0d3c22]/50 hover:shadow-md hover:translate-x-1'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-full transition-colors ${!visit.exitTime ? 'bg-[#0d3c22] text-white shadow-md shadow-[#0d3c22]/30' : 'bg-slate-100 text-slate-500'}`}>
             {!visit.exitTime ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
             <span className="text-gray-400 font-mono text-xs">{visit.entryTime}</span>
             <span className="font-bold text-gray-800 uppercase text-sm group-hover:text-[#0d3c22] transition-colors">{visit.visitorName}</span>
             <span className="text-gray-500 text-xs sm:text-sm font-medium bg-gray-50 px-2 py-0.5 rounded-full">{visit.company}</span>
          </div>
        </div>
        
        {onSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect && onSelect(visit.id); }}
              className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'border-[#0d3c22] bg-[#0d3c22] scale-110' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}
            >
              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
            </button>
        )}
      </div>
    );
  }

  // Linha completa para o Histórico (sem coluna Data — agrupada por dia)
  const clickable = !!onRowClick;
  return (
    <tr
      onClick={clickable ? () => onRowClick!(visit) : undefined}
      className={`border-b border-gray-50 transition-colors group ${
        clickable ? 'cursor-pointer hover:bg-[#0d3c22]/5' : 'hover:bg-[#0d3c22]/5'
      }`}
      title={clickable ? 'Clique para ver detalhes' : undefined}
    >
      <td className="py-5 px-4 text-sm font-bold text-gray-800 group-hover:text-[#0d3c22] transition-colors">
        <span className="inline-flex items-center gap-2">
          {visit.visitorName}
          {clickable && <ChevronRight size={14} className="text-gray-300 group-hover:text-[#0d3c22] transition-colors" />}
        </span>
      </td>
      <td className="py-5 px-4 text-sm text-gray-600 font-medium">
        {visit.company}
      </td>
      <td className="py-5 px-4 text-sm text-gray-500 font-mono whitespace-nowrap">
        {visit.phone || '--'}
      </td>
      <td className="py-5 px-4 text-sm text-gray-600 font-medium break-all">
        {visit.email || '--'}
      </td>
      <td className="py-5 px-4 text-sm text-gray-500 font-mono whitespace-nowrap">
        {visit.entryTime}
      </td>
      <td className="py-5 px-4 text-sm text-gray-500 font-mono whitespace-nowrap">
        {visit.exitTime || <span className="text-white font-bold text-xs bg-[#0d3c22] px-3 py-1 rounded-full shadow-sm shadow-[#0d3c22]/30">Decorrer</span>}
      </td>
      <td className="py-5 px-4 text-sm text-gray-700 font-medium">
        {visit.reason}
      </td>
      <td className="py-5 px-4 text-sm text-gray-600 font-medium">
        {visit.companion || '--'}
      </td>
    </tr>
  );
};
