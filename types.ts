
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

export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  operatorId: string;
}

export interface DocumentInfo {
  type: string; // e.g., "Driver's License", "Work Permit", "State ID"
  extractedText: string;
  confidence: number;
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
    facialSignature?: string; // Neural description of face
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
  brand?: string;
  shape?: string; // Body style
  wheelSignature?: string; // e.g. "5-spoke alloy, black finish"
  bodyModifications?: string[]; // e.g. ["Roof rack", "Tinted windows", "Rear spoiler"]
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
  photos: string[];
  recordings: string[];
  documents?: DocumentInfo[];
}

export interface Interaction {
  id: string;
  type: InteractionType;
  subjectId?: string;
  vehicleId?: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  notes: string;
}

export type AppView = 'dashboard' | 'scanner' | 'person-scanner' | 'history' | 'people' | 'details' | 'person-details' | 'profile' | 'intel' | 'bulk-approval' | 'bulk-upload';
