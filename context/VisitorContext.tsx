import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { VisitorContextType, VisitorData, Language } from '../types';
import { db } from '../services/db';
import { apiFetch } from '../services/api';

const defaultVisitorData: VisitorData = {
  email: '',
  fullName: '',
  phone: '',
  company: '',
  companion: '',
  objects: {
    glasses: false,
    watch: false,
    phone: false,
    others: false,
  },
  visitReason: '',
  acceptedRules: false,
};

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

export const VisitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(Language.PT);
  const [showSplash, setShowSplash] = useState(true);

  const [visitorData, setVisitorData] = useState<VisitorData>(() => {
    try {
      const saved = sessionStorage.getItem('melro_visitor_data');
      // Nunca restaurar acceptedRules como true — evita duplicar visitas ao recarregar
      const parsed = saved ? JSON.parse(saved) : defaultVisitorData;
      return { ...parsed, acceptedRules: false };
    } catch (e) {
      return defaultVisitorData;
    }
  });

  // Guarda para garantir que a visita só é registada UMA vez
  const visitSubmittedRef = useRef(false);

  // Envia para o banco de dados quando o visitante aceita as regras (só 1 vez)
  useEffect(() => {
    if (visitorData.acceptedRules && !visitSubmittedRef.current) {
      const normalizedPhone = visitorData.phone.trim();

      if (!normalizedPhone) {
        console.error('Telemóvel inválido. Não foi possível registar a visita.');
        return;
      }

      // Marcar como já submetido para nunca duplicar
      visitSubmittedRef.current = true;

      // Guardar localmente no localStorage para o processQrScan funcionar
      db.addVisit(visitorData);

      // Enviar para tabela VISITS
      apiFetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: visitorData.fullName,
          company: visitorData.company,
          visitReason: visitorData.visitReason,
          email: visitorData.email ? visitorData.email.trim().toLowerCase() : '',
          phone: normalizedPhone,
          companion: visitorData.companion || '',
          objects: visitorData.objects,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            console.error('Erro ao registrar visitante na tabela VISITS');
          }
        })
        .catch((err) => {
          console.error('Erro de conexão com o servidor (visits):', err);
        });

      // Enviar para tabela VISITORS (dados persistentes por telemóvel)
      apiFetch('/api/visitors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          email: visitorData.email ? visitorData.email.trim().toLowerCase() : '',
          fullName: visitorData.fullName,
          company: visitorData.company,
          visitReason: visitorData.visitReason,
          companion: visitorData.companion || '',
        }),
      }).catch((err) => {
        console.error('Erro ao salvar na tabela VISITORS:', err);
      });
    }
  }, [visitorData]);

  // Salva os dados localmente em sessionStorage
  useEffect(() => {
    sessionStorage.setItem('melro_visitor_data', JSON.stringify(visitorData));
  }, [visitorData]);

  const updateVisitorData = (data: Partial<VisitorData>) => {
    setVisitorData((prev) => ({ ...prev, ...data }));
  };

  const resetVisitor = () => {
    visitSubmittedRef.current = false;
    setVisitorData(defaultVisitorData);
    sessionStorage.removeItem('melro_visitor_data');
  };

  // Busca os dados pelo telemóvel na tabela VISITORS
  const handlePhoneChange = async (phone: string) => {
    updateVisitorData({ phone });
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.length < 7) return;

    try {
      const res = await apiFetch(`/api/visitors/phone/${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        updateVisitorData({
          fullName: data.fullName,
          email: data.email || '',
          company: data.company,
          visitReason: data.visitReason,
          companion: data.companion || '',
        });
      }
    } catch (err) {
      console.log('Visitante não encontrado ou erro na busca:', err);
    }
  };

  return (
    <VisitorContext.Provider
      value={{
        language,
        setLanguage,
        visitorData,
        updateVisitorData,
        resetVisitor,
        showSplash,
        setShowSplash,
        handlePhoneChange,
      }}
    >
      {children}
    </VisitorContext.Provider>
  );
};

export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (!context) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  return context;
};
