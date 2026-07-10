import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Visit } from '../../o-melro-backoffice teste (1)/types';
import { visitService } from '../../o-melro-backoffice teste (1)/services/visitService';


export const AdminHistory: React.FC = () => {
  const [filtername, setFilterName] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    visitService.getAll().then(setVisits);
  }, []);
  const names = useMemo(() => [...new Set(visits.map(v => v.visitorName).filter(Boolean))].sort(), [visits]);
  const companies = useMemo(() => [...new Set(visits.map(v => v.company).filter(Boolean))].sort(), [visits]);
  const reasons = useMemo(() => [...new Set(visits.map(v => v.reason).filter(Boolean))].sort(), [visits]);
  const dates = useMemo(() => [...new Set(visits.map(v => v.date).filter(Boolean))].sort().reverse(), [visits]);

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (filtername && v.visitorName !== filtername) return false;
      if (filterCompany && v.company !== filterCompany) return false;
      if (filterReason && v.reason !== filterReason) return false;
      if (filterDate && v.date !== filterDate) return false;
      return true;
    });
  }, [visits, filtername, filterCompany, filterReason, filterDate]);

  const handleSearch = () => {
    visitService.getAll().then(setVisits);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">
            Histórico de Visitas
          </h2>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex gap-2">
              <select
                value={filtername}
                onChange={(e) => setFilterName(e.target.value)}
                className="bg-transparent border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-500 outline-none cursor-pointer"
              >
                <option value="">Todos</option>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="bg-transparent border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-500 outline-none cursor-pointer"
              >
                <option value="">Todas</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="bg-transparent border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-500 outline-none cursor-pointer"
              >
                <option value="">Todos</option>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-500 outline-none cursor-pointer"
              >
                <option value="">Todas</option>
                {dates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#0d3c22] text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-[#0a2e1a] transition-colors"
            >
              Pesquisar
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Data</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Empresa</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Telemóvel</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Entrada</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Saída</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Motivo</th>
                  <th className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Pessoa a visitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-xs font-bold text-gray-500">
                      {visit.date || '--'}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800">
                      {visit.visitorName}
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-500 uppercase">
                      {visit.company}
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-500">
                      {visit.phone || '--'}
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-500">
                      {visit.email || '--'}
                    </td>
                    <td className="p-4 text-xs text-melro-green font-mono">
                      {visit.entryTime || '--:--'}
                    </td>
                    <td className="p-4 text-xs text-gray-400 font-mono">
                      {visit.exitTime || '--:--'}
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-600">
                      {visit.reason}
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-600">
                      {visit.companion || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredVisits.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhum registo encontrado.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
