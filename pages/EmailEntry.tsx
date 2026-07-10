import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitor } from '../context/VisitorContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { UI_LABELS } from '../constants';
import { apiFetch } from '../services/api';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export const EmailEntry: React.FC = () => {
  const navigate = useNavigate();
  const { language, updateVisitorData, visitorData } = useVisitor();
  
  const [phone, setPhone] = useState(visitorData.phone || '');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'found' | 'asking-reason'>('idle');
  const [foundVisitorData, setFoundVisitorData] = useState<any>(null);

  const labels = UI_LABELS[language];

  const validatePhone = (input: string) => {
    const cleaned = input.replace(/[\s\-()]/g, '');
    return /^\+?[0-9]{7,15}$/.test(cleaned);
  };

  const handleSameReason = () => {
    if (foundVisitorData) {
      updateVisitorData({
        fullName: foundVisitorData.fullName,
        email: foundVisitorData.email || '',
        company: foundVisitorData.company,
        companion: foundVisitorData.companion || '',
        visitReason: foundVisitorData.visitReason,
        acceptedRules: false,
        phone: phone.trim(),
        objects: {
          glasses: false,
          watch: false,
          phone: false,
          others: false
        }
      });
      setStatus('found');
      setTimeout(() => {
        navigate('/rules');
      }, 800);
    }
  };

  const handleDifferentReason = () => {
    if (foundVisitorData) {
      updateVisitorData({
        fullName: foundVisitorData.fullName,
        email: foundVisitorData.email || '',
        company: foundVisitorData.company,
        companion: foundVisitorData.companion || '',
        visitReason: '',
        acceptedRules: false,
        phone: phone.trim(),
        objects: {
          glasses: false,
          watch: false,
          phone: false,
          others: false
        }
      });
      navigate('/form');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      setError(language === 'pt-PT' ? 'Por favor, introduza o seu número de telemóvel.' : language === 'es-ES' ? 'Por favor, introduzca su número de teléfono.' : 'Please enter your phone number.');
      return;
    }

    if (!validatePhone(cleanPhone)) {
      setError(language === 'pt-PT' ? 'O formato do número parece inválido.' : language === 'es-ES' ? 'El formato del número parece inválido.' : 'The phone number format seems invalid.');
      return;
    }

    updateVisitorData({ phone: cleanPhone });
    setStatus('checking');

    apiFetch(`/api/visitors/phone/${encodeURIComponent(cleanPhone)}`)
      .then(res => {
        if (!res.ok) throw new Error('Visitante não encontrado');
        return res.json();
      })
      .then((data) => {
        setFoundVisitorData(data);
        setStatus('asking-reason');
      })
      .catch(() => {
        // Visitante novo
        setStatus('valid');
        setTimeout(() => {
          navigate('/form');
        }, 500);
      });
  };

  return (
    <Layout>
      <div className="w-full max-w-lg animate-fade-in-up">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="text-left relative">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {labels.phoneLabel}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9\s+\-()]*$/.test(val)) {
                    setPhone(val);
                    setError('');
                    setStatus('idle');
                  }
                }}
                placeholder={labels.phonePlaceholder}
                disabled={status !== 'idle'}
                autoComplete="tel"
                className={`w-full bg-gray-100 border-2 ${error ? 'border-red-400 bg-red-50' : (status === 'valid' || status === 'found' || status === 'asking-reason') ? 'border-melro-green bg-melro-green/10' : 'border-gray-200 focus:border-melro-green'} rounded-lg px-4 py-4 text-gray-700 outline-none transition-colors duration-200 pr-12`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {status === 'checking' && <Loader2 className="animate-spin text-melro-green" size={20} />}
                {(status === 'valid' || status === 'found' || status === 'asking-reason') && <CheckCircle2 className="text-melro-green animate-scale-in" size={24} />}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-2 font-medium animate-fade-in flex items-center gap-1">
                ⚠️ {error}
              </p>
            )}

            {status === 'found' && (
              <p className="text-green-600 text-sm mt-2 font-bold animate-fade-in">
                {language === 'pt-PT' ? '👋 Bem-vindo de volta! Redirecionando...' : language === 'es-ES' ? '👋 ¡Bienvenido de nuevo! Redirigiendo...' : '👋 Welcome back! Redirecting...'}
              </p>
            )}

            {status === 'asking-reason' && foundVisitorData && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
                <p className="text-blue-800 font-semibold mb-2">
                  {language === 'pt-PT' ? '👋 Bem-vindo de volta!' : language === 'es-ES' ? '👋 ¡Bienvenido de nuevo!' : '👋 Welcome back!'}
                </p>
                <p className="text-blue-700 text-sm mb-1">
                  {language === 'pt-PT' ? 'Último motivo da visita:' : language === 'es-ES' ? 'Último motivo de la visita:' : 'Last visit reason:'}
                </p>
                <p className="text-blue-900 font-medium mb-3">
                  {foundVisitorData.visitReason}
                </p>
                <p className="text-blue-800 font-semibold mb-3">
                  {language === 'pt-PT' ? 'Pelo mesmo motivo?' : language === 'es-ES' ? '¿Por el mismo motivo?' : 'Same reason?'}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleSameReason}
                    variant="secondary"
                    className="flex-1 !bg-green-500 hover:!bg-green-600 !text-white font-bold text-sm"
                  >
                    {language === 'pt-PT' ? 'Sim' : language === 'es-ES' ? 'Sí' : 'Yes'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDifferentReason}
                    variant="ghost"
                    className="flex-1 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-bold text-sm"
                  >
                    {language === 'pt-PT' ? 'Não' : language === 'es-ES' ? 'No' : 'No'}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2 ml-1">
              {language === 'pt-PT' ? 'Usamos o telemóvel para identificar o visitante.' : language === 'es-ES' ? 'Usamos el teléfono para identificar al visitante.' : 'We use the phone number to identify the visitor.'}
            </p>
          </div>

          <div className={`mt-4 flex flex-col-reverse md:flex-row gap-4 ${status === 'asking-reason' ? 'hidden' : ''}`}>
            <Button
              type="button"
              onClick={() => navigate('/')}
              variant="ghost"
              disabled={status !== 'idle'}
              className="w-full md:w-auto min-w-[120px] uppercase tracking-wider text-sm font-bold flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              {labels.back}
            </Button>

            <Button
              type="submit"
              variant="secondary"
              fullWidth
              disabled={status !== 'idle'}
              className={`
                font-bold py-4 uppercase tracking-widest text-sm shadow-md transition-all
                ${(status === 'valid' || status === 'found') ? '!bg-green-500 !text-white' : '!bg-gray-500 hover:!bg-gray-600 !text-white'}
              `}
            >
              {status === 'checking' ? (language === 'es-ES' ? 'Verificando...' : 'A verificar...') : (status === 'valid' || status === 'found') ? (language === 'es-ES' ? 'Confirmado' : 'Confirmado') : labels.continue}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
