export enum Language {
  PT = 'pt-PT',
  EN = 'en-US',
  ES = 'es-ES'
}

export interface PersonalObjects {
  glasses: boolean;
  watch: boolean;
  phone: boolean;
  others: boolean;
}

export interface VisitorData {
  id?: string;
  email: string;
  fullName: string;
  phone: string;
  company: string;
  companion: string;
  objects: PersonalObjects;
  visitReason: string;
  acceptedRules: boolean;
}


export interface VisitRecord extends VisitorData {
  id: string;
  checkIn: string; // ISO Date String
  checkOut?: string | null; // ISO Date String
  status: 'active' | 'completed';
}

export interface VisitorContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  visitorData: VisitorData;
  updateVisitorData: (data: Partial<VisitorData>) => void;
  resetVisitor: () => void;
  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  handlePhoneChange: (phone: string) => void;
}

