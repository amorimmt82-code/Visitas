import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitor } from '../context/VisitorContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { UI_LABELS } from '../constants';
import { ChevronDown, Check, ArrowLeft } from 'lucide-react';

export const VisitorForm: React.FC = () => {
  const navigate = useNavigate();
  const { language, visitorData, updateVisitorData } = useVisitor();

  const labels = UI_LABELS[language];

  const toggleObject = (key: keyof typeof visitorData.objects) => {
    updateVisitorData({
      objects: {
        ...visitorData.objects,
        [key]: !visitorData.objects[key]
      }
    });
  };

  const isFormValid =
    visitorData.fullName &&
    visitorData.company &&
    visitorData.visitReason;

  const handleSubmit = () => {
    if (isFormValid) {
      navigate('/rules');
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-5xl animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Dados pessoais */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {labels.nameLabel}
              </label>
              <input
                type="text"
                value={visitorData.fullName}
                onChange={(e) => updateVisitorData({ fullName: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 focus:border-melro-green rounded-lg px-4 py-3 outline-none transition-colors"
                placeholder={labels.nameLabel}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {labels.companyLabel}
              </label>
              <input
                type="text"
                value={visitorData.company}
                onChange={(e) => updateVisitorData({ company: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 focus:border-melro-green rounded-lg px-4 py-3 outline-none transition-colors"
                placeholder={labels.companyLabel}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {labels.emailLabel} <span className="text-gray-400 font-normal normal-case">{labels.emailOptional}</span>
              </label>
              <input
                type="email"
                value={visitorData.email}
                onChange={(e) => updateVisitorData({ email: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 focus:border-melro-green rounded-lg px-4 py-3 outline-none transition-colors"
                placeholder={labels.emailPlaceholder}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {labels.companionLabel} <span className="text-gray-400 font-normal normal-case">{labels.emailOptional}</span>
              </label>
              <input
                type="text"
                value={visitorData.companion}
                onChange={(e) => updateVisitorData({ companion: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 focus:border-melro-green rounded-lg px-4 py-3 outline-none transition-colors"
                placeholder={labels.companionPlaceholder}
              />
            </div>
          </div>

          {/* Objetos e motivo */}
          <div className="flex flex-col h-full justify-between gap-8">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide">
                {labels.objectsLabel}
              </label>
              <div className="space-y-3">
                {(['glasses', 'watch', 'phone', 'others'] as const).map((objKey) => (
                  <div
                    key={objKey}
                    onClick={() => toggleObject(objKey)}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-melro-green transition-colors group"
                  >
                    <span className="text-gray-600 font-medium group-hover:text-gray-800">
                      {labels.objects[objKey]}
                    </span>
                    <div
                      className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                        visitorData.objects[objKey]
                          ? 'bg-melro-green border-melro-green'
                          : 'border-gray-300'
                      }`}
                    >
                      {visitorData.objects[objKey] && <Check size={16} className="text-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {labels.reasonLabel}
              </label>
              <div className="relative z-10">
                <select
                  value={visitorData.visitReason}
                  onChange={(e) => updateVisitorData({ visitReason: e.target.value })}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 focus:border-melro-green rounded-lg px-4 py-3 outline-none transition-colors text-gray-700 cursor-pointer"
                >
                  <option value="" disabled>
                    {labels.reasonPlaceholder}
                  </option>
                  {labels.reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={20}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="mt-12 flex flex-col-reverse md:flex-row justify-end gap-4">
          <Button
            onClick={() => navigate('/phone')}
            variant="ghost"
            className="w-full md:w-auto min-w-[150px] uppercase tracking-wider text-sm font-bold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            {labels.back}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            variant="secondary"
            className="w-full md:w-auto min-w-[200px] uppercase tracking-wider text-sm font-bold"
          >
            {labels.continue}
          </Button>
        </div>
      </div>
    </Layout>
  );
};



