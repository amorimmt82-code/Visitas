import React, { useEffect, useState } from 'react';
import { db } from '../../services/db';
import { VisitRecord } from '../../types';

const AdminVisitHistory: React.FC = () => {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    setVisits(db.getAll());
  }, []);

  const filteredVisits = visits.filter(v => {
    const matchesSearch =
      v.fullName.toLowerCase().includes(filter.toLowerCase()) ||
      v.company.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ✅ Correção aqui: aceita string, null ou undefined
  const format = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Histórico de Visitas</h1>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por nome ou empresa..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-4 py-2 w-full md:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border rounded px-4 py-2"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="completed">Finalizados</option>
        </select>
      </div>

      {filteredVisits.length === 0 ? (
        <p className="text-gray-500">Nenhuma visita encontrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border rounded overflow-hidden">
            <thead className="bg-gray-100 text-sm uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Empresa</th>
                <th className="px-4 py-2">Entrada</th>
                <th className="px-4 py-2">Saída</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-2">{v.fullName}</td>
                  <td className="px-4 py-2">{v.company}</td>
                  <td className="px-4 py-2">{format(v.checkIn)}</td>
                  <td className="px-4 py-2">{format(v.checkOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminVisitHistory;
