import { VisitRecord, VisitorData } from '../types';
import { apiFetch } from './api';

const STORAGE_KEY = 'melro_visits_db';
const SYNC_QUEUE_KEY = 'melro_sync_queue';

// --- Sincronização com o backoffice ---
interface SyncItem {
  qrContent: string;
  timestamp: string;
}

const getSyncQueue = (): SyncItem[] => {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveSyncQueue = (queue: SyncItem[]) => {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

const syncToBackoffice = (qrContent: string) => {
  let data: any;
  try { data = JSON.parse(qrContent); } catch { return; }

  const payload = {
    visitorName: data.n,
    company: data.c,
    email: data.e || '',
    phone: data.p,
  };

  apiFetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(res => {
      if (res.ok) {
        console.log('✅ Sincronizado com backoffice');
      } else {
        throw new Error('resposta não ok');
      }
    })
    .catch(() => {
      // Backoffice indisponível — guardar na fila
      const queue = getSyncQueue();
      queue.push({ qrContent, timestamp: new Date().toISOString() });
      saveSyncQueue(queue);
      console.warn('⏳ Backoffice offline — guardado na fila de sincronização');
    });
};

// Tenta reenviar itens pendentes da fila
const flushSyncQueue = () => {
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const remaining: SyncItem[] = [];

  queue.forEach(item => {
    let data: any;
    try { data = JSON.parse(item.qrContent); } catch { return; }

    const payload = {
      visitorName: data.n,
      company: data.c,
      email: data.e || '',
      phone: data.p,
    };

    apiFetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (res.ok) {
          console.log('✅ Item da fila sincronizado com backoffice');
        } else {
          remaining.push(item);
        }
      })
      .catch(() => {
        remaining.push(item);
      })
      .finally(() => {
        saveSyncQueue(remaining);
      });
  });
};

// Tentar sincronizar a fila a cada 30 segundos
setInterval(flushSyncQueue, 30_000);
// E também ao carregar
setTimeout(flushSyncQueue, 5_000);

// Função robusta para gerar IDs que funciona em qualquer navegador ou rede (HTTP/HTTPS)
const generateId = (): string => {
  // Tenta usar a API segura se disponível
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Falha silenciosa para usar o fallback
    }
  }
  
  // Fallback: Algoritmo manual compatível com redes antigas ou não seguras
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Simulating a database using LocalStorage
export const db = {
  getAll: (): VisitRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Helper para recuperar dados de visitante recorrente
  getLastVisitByPhone: (phone: string): VisitRecord | undefined => {
    const visits = db.getAll();
    return visits.find(v => v.phone.trim() === phone.trim());
  },

  addVisit: (visitor: VisitorData): VisitRecord => {
    const visits = db.getAll();
    const newVisit: VisitRecord = {
      ...visitor,
      id: generateId(), // Usa o gerador seguro
      checkIn: new Date().toISOString(),
      checkOut: null,
      status: 'active'
    };
    visits.unshift(newVisit); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    return newVisit;
  },

  checkOut: (id: string): void => {
    const visits = db.getAll();
    const updated = visits.map(v => {
      if (v.id === id) {
        return { ...v, checkOut: new Date().toISOString(), status: 'completed' as const };
      }
      return v;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  getStats: () => {
    const visits = db.getAll();
    const today = new Date().toDateString();
    
    // Start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0,0,0,0);

    return {
      active: visits.filter(v => v.status === 'active').length,
      todayTotal: visits.filter(v => new Date(v.checkIn).toDateString() === today).length,
      weekTotal: visits.filter(v => new Date(v.checkIn) >= startOfWeek).length
    };
  },

  /**
   * Processa o QR Code localmente usando o localStorage.
   * Se não encontrar localmente, tenta a API do backoffice como fallback.
   * Compatível com o formato JSON { n, c, e, p } gerado pelo BadgeCard.
   */
  processQrScan: async (qrContent: string): Promise<{ type: 'ENTRY' | 'EXIT' | 'ALREADY_EXITED' | 'ERROR'; visit: VisitRecord | null; message: string }> => {
    let data: any;
    try {
      data = JSON.parse(qrContent);
    } catch {
      return { type: 'ERROR', visit: null, message: 'Formato do QR Code inválido.' };
    }

    if (!data.n || !data.c || !data.p) {
      return { type: 'ERROR', visit: null, message: 'QR Code incompleto ou inválido.' };
    }

    const visits = db.getAll();
    const phone = (data.p as string).trim();

    // Procura visita ativa que corresponda ao número de telemóvel
    const activeVisit = visits.find(
      v => v.status === 'active' && v.phone.trim() === phone
    );

    if (activeVisit) {
      db.checkOut(activeVisit.id);
      const updated: VisitRecord = { ...activeVisit, checkOut: new Date().toISOString(), status: 'completed' };
      // Sincronizar a saída com o backoffice em segundo plano
      syncToBackoffice(qrContent);
      return { type: 'EXIT', visit: updated, message: `Saída registada para ${activeVisit.fullName}.` };
    }

    // Sem visita ativa — verificar se já saiu hoje (local)
    const completedToday = visits.find(v => {
      if (v.status !== 'completed' || v.phone.trim() !== phone) return false;
      const checkOutDate = v.checkOut ? new Date(v.checkOut).toDateString() : null;
      return checkOutDate === new Date().toDateString();
    });

    if (completedToday) {
      return { type: 'ALREADY_EXITED', visit: completedToday, message: `${completedToday.fullName} já registou saída hoje.` };
    }

    // Sem visita ativa e sem saída hoje — QR já foi usado, não permitir nova entrada
    return { type: 'ERROR', visit: null, message: 'Visitante não encontrado ou já saiu.' };
  }
};