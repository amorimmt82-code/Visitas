import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Visit } from '../../o-melro-backoffice teste (1)/types';
import { LogOut, LogIn } from 'lucide-react';
import { visitService } from '../../o-melro-backoffice teste (1)/services/visitService'; // Corrigido o caminho

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ active: 0, todayTotal: 0, weekTotal: 0 });
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);

  const loadData = async () => {
    try {
      const statsData = await visitService.getStats();
      const allVisits = await visitService.getAll();

      setStats({
        active: statsData.activeVisits,
        todayTotal: statsData.totalToday,
        weekTotal: statsData.totalWeek,
      });

      setRecentVisits(allVisits.slice(0, 5));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckOut = async (id: string) => {
    if (confirm('Confirmar saída deste visitante?')) {
      try {
        await visitService.checkOut(id);
        loadData();
      } catch (err) {
        console.error('Erro ao registar saída:', err);
      }
    }
  };

  const StatCard = ({ value, label }: { value: number; label: string }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow h-40">
      <span className="text-4xl font-black text-gray-800 mb-2">{value}</span>
      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider text-center">{label}</span>
    </div>
  );

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Stats */}
        <div className="space-y-8">
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">Dashboard</h2>
          <div className="space-y-6">
            <StatCard value={stats.active} label="visitas a decorrer" />
            <div className="grid grid-cols-2 gap-6">
              <StatCard value={stats.todayTotal} label="total de visitas hoje" />
              <StatCard value={stats.weekTotal} label="total de visitas da semana" />
            </div>
          </div>
        </div>

        {/* Right Column: Recent List */}
        <div>
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide mb-8">Últimas Visitas</h2>

          <div className="space-y-4">
            {recentVisits.length === 0 && (
              <p className="text-gray-400 text-sm italic">Nenhuma visita registada ainda.</p>
            )}

            {recentVisits.map((visit) => (
              <div key={visit.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${!visit.exitTime ? 'bg-melro-green/10 text-melro-green' : 'bg-red-50 text-red-400'}`}>
                    {!visit.exitTime ? <LogIn size={20} /> : <LogOut size={20} />}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-400 text-xs font-mono">{visit.entryTime}</span>
                      <h3 className="text-gray-800 font-bold text-sm">{visit.visitorName}</h3>
                      <span className="text-gray-400 text-xs italic">{visit.company}</span>
                      {visit.email && (
                        <div className="text-gray-500 text-[10px] font-mono">{visit.email}</div>
                      )}
                    </div>
                    {visit.exitTime && (
                      <div className="text-red-400 text-[10px] uppercase font-bold mt-1">
                        Saiu às {visit.exitTime}
                      </div>
                    )}
                  </div>
                </div>

                {!visit.exitTime && (
                  <button
                    onClick={() => handleCheckOut(visit.id)}
                    className="text-xs font-bold text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-500 rounded px-3 py-1 transition-colors uppercase"
                  >
                    Registar Saída
                  </button>
                )}
              </div>
            ))}

            <div className="flex gap-4 pt-4">
              <button className="flex-1 bg-[#FBBF24] hover:bg-[#F59E0B] text-melro-dark font-bold text-xs uppercase tracking-widest py-3 rounded shadow-sm transition-colors">
                Ver Mais
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
