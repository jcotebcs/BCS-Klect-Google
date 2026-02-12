
export enum VehicleCategory {
  NORMAL = 'Normal',
  SUSPICIOUS = 'Suspicious',
  WANTED = 'Wanted',
  STOLEN = 'Stolen',
  ABANDONED = 'Abandoned',
  COMMERCIAL = 'Commercial',
  DELIVERY = 'Delivery',
  CONTRACTOR = 'Contractor',
  EMERGENCY = 'Emergency',
  PUBLIC_WORKS = 'Public Works',
  DIPLOMATIC = 'Diplomatic',
  VIP = 'VIP',
  RENTAL = 'Rental',
  VISITOR = 'Visitor',
  EMPLOYEE = 'Employee',
  RESIDENT = 'Resident'
}

export enum InteractionType {
  SIGHTING = 'Sighting',
  TRESPASS = 'Trespass',
  NOTIFICATION = 'Notification'
}

export enum TrespassWarningType {
  VERBAL = 'Verbal',
  WRITTEN = 'Written',
  NONE = 'None'
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  operatorId: string;
}

export interface DocumentInfo {
  type: string;
  extractedText: string;
  confidence: number;
}

export interface AssetPhoto {
  url: string;
  label: string;
  timestamp: string;
}

export interface LogoReference {
  id: string;
  label: string;
  base64: string;
  timestamp: string;
}

export interface NeuralSample {
  id: string;
  thumbnail: string;
  verifiedData: {
    year: string;
    make: string;
    model: string;
    shape: string;
  };
  timestamp: string;
}

export interface PersonRecord {
  id: string;
  name: string;
  ssn?: string;
  biometrics: {
    height?: string;
    hair?: string;
    eyes?: string;
    distinguishingMarks?: string[];
    facialSignature?: string;
  };
  associatedPlates: string[];
  photos: string[];
  recordings: string[];
  notes: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  documents?: DocumentInfo[];
}

export interface VehicleRecord {
  id: string;
  plate: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trimLevel?: string;
  marketValue?: number;
  marketValueConfidence?: number;
  plantCountry?: string;
  brand?: string;
  shape?: string;
  wheelSignature?: string;
  bodyModifications?: string[];
  logoDetected?: boolean;
  logoText?: string; 
  color: string;
  category: VehicleCategory;
  timestamp: string;
  associatedPersonId?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  notes?: string;
  photos: AssetPhoto[];
  recordings: string[];
  documents?: DocumentInfo[];
  lastSighting?: string;
  vinData?: Record<string, string>;
  stolenCheckResult?: {
    isStolen: boolean;
    details: string;
    timestamp: string;
    sources: { title: string; uri: string }[];
  };
}

export interface Interaction {
  id: string;
  type: InteractionType;
  subjectId?: string;
  vehicleId?: string;
  timestamp: string;
  location?: { lat: number; lng: number; address?: string };
  notes: string;
  operatorName: string;
  warningType?: TrespassWarningType;
}

export type AppView = 'dashboard' | 'scanner' | 'person-scanner' | 'history' | 'people' | 'details' | 'person-details' | 'profile' | 'intel' | 'bulk-approval' | 'bulk-upload' | 'logo-lab' | 'neural-lab' | 'new-asset';
