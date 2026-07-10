import React from 'react';
import QRCode from "react-qr-code";
import { VisitorData } from '../types';

export const BadgeCard = React.forwardRef<HTMLDivElement, { visitor: VisitorData }>(
  ({ visitor }, ref) => {
    // Normalizar email para minúsculas para garantir correspondência com o banco de dados
    const normalizedEmail = (visitor.email || '').trim().toLowerCase();
    const qrValue = JSON.stringify({
      n: visitor.fullName,
      e: normalizedEmail,
      c: visitor.company,
      p: visitor.phone,
      t: new Date().toISOString(),
    });

    return (
      <div ref={ref} className="relative group perspective-1000 badge-container">
        <div
            className="w-[640px] h-[426px] bg-white rounded-[18px] flex relative overflow-hidden border-2 border-gray-200 shadow-2xl"
          style={{
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden rounded-[18px]">
            <div className="absolute -top-[50%] -right-[20%] w-[80%] h-[150%] bg-melro-green rounded-[40%] transform -rotate-12"></div>
          </div>

          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-3 bg-gray-100 rounded-full z-20 opacity-90 border-2 border-gray-300"></div>
          <div className="w-[50%] h-full px-5 py-4 flex flex-col justify-between relative z-10">
            <div className="flex flex-col items-start flex-shrink-0">
              <img
                src="/logo.png"
                alt="O Melro"
                  className="h-11 w-auto object-contain mb-1"
              />
              <p className="text-[16px] text-black uppercase tracking-[0.3em] font-sans font-bold ml-0.5">Visitor Pass</p>
            </div>

            <div className="flex flex-col justify-center flex-grow mt-1">
                <p className="text-[17px] font-bold text-black uppercase tracking-widest mb-1 flex-shrink-0">Visitante</p>
                <h2 className="text-[28px] font-black text-black leading-snug break-words mb-2 flex-shrink-0">
                {visitor.fullName || 'Nome do Visitante'}
              </h2>

              <div className="inline-block bg-melro-green/10 px-3 py-1.5 rounded-lg border border-melro-green/20 self-start max-w-full flex-shrink-0">
                <p className="text-[22px] font-bold text-black uppercase tracking-wide break-words leading-snug py-0.5">
                  {visitor.company || 'Empresa Externa'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2 flex-shrink-0">
                <p className="text-[16px] font-bold text-black uppercase tracking-widest mb-0.5">Motivo</p>
                <p className="text-[24px] font-bold text-black break-words leading-snug">
                {visitor.visitReason || 'Visita'}
              </p>
            </div>
          </div>

          <div className="w-[50%] h-full bg-[#FAFAFA] border-l border-gray-200 p-3 flex flex-col items-center justify-center relative z-10">
            <div className="relative mb-2">
              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-[3px] border-l-[3px] border-melro-green rounded-tl-lg"></div>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-[3px] border-r-[3px] border-melro-green rounded-tr-lg"></div>
              <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-[3px] border-l-[3px] border-melro-green rounded-bl-lg"></div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-[3px] border-r-[3px] border-melro-green rounded-br-lg"></div>

                <div className="p-2 bg-white shadow-sm rounded-lg">
                  <div style={{ width: 285, height: 285 }} className="overflow-hidden">
                    <QRCode
                      value={qrValue}
                      size={285}
                      fgColor="#0d3c22"
                      bgColor="#FFFFFF"
                      level="Q"
                      style={{ width: '285px', height: '285px', display: 'block' }}
                    />
                  </div>
                </div>
            </div>

              <div className="w-full bg-white rounded-lg p-2 text-center border border-gray-200 shadow-sm">
                <p className="text-[13px] font-bold text-black uppercase tracking-widest mb-0.5 leading-snug">Válido Até</p>
                <p className="text-[22px] font-bold text-black font-mono leading-snug">{new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </p>
            </div>
          </div>
        </div>
      </div>
    );
  }


);




