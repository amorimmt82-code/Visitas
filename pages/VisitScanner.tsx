import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { apiFetch } from '../services/api';

interface Visit {
  id: string;
  visitorName: string;
  company: string;
  entryTime: string;
  exitTime: string | null;
  date: string;
  reason: string;
  email?: string;
}

export const VisitScanner: React.FC = () => {
  const { id } = useParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [status, setStatus] = useState<'loading' | 'notfound' | 'checkedout' | 'alreadyOut'>('loading');
  const alreadyScannedRef = React.useRef(false); // ✅ aqui está a declaração


  useEffect(() => {
  if (!id || alreadyScannedRef.current) return;

  alreadyScannedRef.current = true; // ✅ protege contra múltiplos fetches

  apiFetch(`/api/visits/${id}`)
    .then(res => {
      if (!res.ok) throw new Error('Visita não encontrada');
      return res.json();
    })
    .then((data: Visit) => {
      setVisit(data);

      if (data.exitTime) {
        setStatus('alreadyOut');
      } else {
        const now = new Date();
        const formattedTime = now.toTimeString().slice(0, 5);

        apiFetch(`/api/visits/${id}/checkout`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exitTime: formattedTime })
        })
          .then(res => {
            if (!res.ok) throw new Error('Erro ao registar saída');
            setStatus('checkedout');
          })
          .catch(() => setStatus('alreadyOut'));
      }
    })
    .catch(() => {
      setStatus('notfound');
    });
}, [id]);

  const formatTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <div className="text-gray-500 flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 animate-spin" /> A verificar o registo...
          </div>
        )}

        {status === 'notfound' && (
          <div className="text-red-600 space-y-2" role="alert">
            <AlertTriangle className="w-10 h-10 mx-auto" />
            <h2 className="font-bold text-lg">Registo não encontrado</h2>
            <p>O QR Code não corresponde a nenhum visitante.</p>
          </div>
        )}

        {visit && status === 'checkedout' && (
          <div className="text-green-600 space-y-2" role="alert">
            <CheckCircle2 className="w-10 h-10 mx-auto" />
            <h2 className="font-bold text-lg">Saída registada com sucesso!</h2>
            <p>
              <strong>{visit.visitorName}</strong> saiu às {formatTime(new Date().toISOString())}.
            </p>
          </div>
        )}

        {visit && status === 'alreadyOut' && (
          <div className="text-yellow-600 space-y-2" role="alert">
            <AlertTriangle className="w-10 h-10 mx-auto" />
            <h2 className="font-bold text-lg">Visitante já saiu</h2>
            <p>
              <strong>{visit.visitorName}</strong> entrou às {formatTime(visit.entryTime)} e saiu às {formatTime(visit.exitTime)}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
