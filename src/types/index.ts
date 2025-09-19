export interface User {
  uid: string;
  email: string;
  role: 'owner' | 'assistant' | 'admin';
  businessId?: string | null;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
  businessAccess?: Record<string, {
    businessId: string;
    businessName: string;
    businessKey: string;
    role: 'admin' | 'editor' | 'viewer';
    addedAt: string;
  }>;
  currentBusiness?: string | null;
  isBlocked?: boolean;
  blockedReason?: string;
  // Propiedad legacy para compatibilidad
  businessKeys?: BusinessKeyAccess[];
}

export interface BusinessKeyAccess {
  businessId: string;
  businessName: string;
  businessKey: string;
  addedAt: string;
}

export interface BusinessLicense {
  type: '15days' | '1month' | '3months' | '6months' | '1year';
  startDate: string;
  endDate: string;
  isActive: boolean;
  assignedBy: string; // Admin user ID
  assignedAt: string;
  renewalCount: number;
}

export interface Business {
  id: string;
  name: string;
  categories: BusinessCategory[];
  services?: Service[];
  operatingHours: OperatingHours;
  ownerId: string;
  businessKey: string; // Clave hexadecimal única para asistentes
  createdAt: string;
  updatedAt: string;
  category?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  license?: BusinessLicense;
  isActive?: boolean;
}

export type BusinessCategory = 
  | 'dermatology'
  | 'nails'
  | 'nutrition'
  | 'psychology'
  | 'dentistry'
  | 'physiotherapy'
  | 'massage'
  | 'acupuncture'
  | 'beauty'
  | 'hair'
  | 'fitness'
  | 'veterinary'
  | 'consulting'
  | 'education'
  | 'yoga'
  | 'barbershop'
  | 'other';

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  category: string;
  resources: number; // number of resources available (e.g., 3 spa beds)
  availableHours?: string; // specific hours when service is available
  notes?: string;
  price?: number;
  isActive?: boolean; // Para controlar si el servicio aparece en las cards
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string; // "09:00"
  closeTime?: string; // "18:00"
}

export interface BusinessCategoryInfo {
  id: BusinessCategory;
  name: string;
  description: string;
  icon: string;
  defaultServices: string[];
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  allergies?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  businessId: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string; // ISO date string
  startTime: string; // "14:30"
  endTime: string; // "16:00"
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdBy: string; // user id
  businessId: string;
  createdAt: string;
  updatedAt: string;
  resourceIndex?: number; // for services with multiple resources
}

export interface DigitalRecord {
  id: string;
  clientId: string;
  businessId: string;
  serviceId: string;
  treatment: string;
  date: string;
  notes: string;
  diagnosis?: string;
  duration?: number;
  category?: BusinessCategory;
  data?: Record<string, any>; // flexible structure for additional data
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Specific record types for different business types
export interface DermatologyRecord {
  date: string;
  diagnosis: string;
  treatment: string;
  medications: string;
  progress: string;
  allergies: string[];
  photos?: string[]; // URLs to Firebase Storage
  familyHistory?: string;
  observations?: string;
}

export interface AcupunctureRecord {
  date: string;
  acupuncturePoints: string[];
  sessionDuration: number;
  symptomsAddressed: string;
  patientResponse: string;
  followUpNotes: string;
  previousSessions?: string;
}

export interface RehabilitationRecord {
  date: string;
  therapyType: string;
  duration: number;
  patientProgress: string;
  homeExercises: string;
  painScale: number; // 1-10
  complications?: string;
  futurePlan?: string;
}

export interface NailsRecord {
  date: string;
  serviceType: string;
  preferences: string;
  allergies: string[];
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'appointment_pending' | 'appointment_reminder' | 'system' | 'error' | 'license_expiring' | 'license_expired' | 'account_blocked' | 'account_reactivated' | 'assistant_linked' | 'record_updated';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  businessId?: string;
  userId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface Report {
  id: string;
  type: 'appointments' | 'clients' | 'services' | 'revenue';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  data: any;
  generatedAt: string;
  businessId: string;
}

export interface AppointmentStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface ServiceStats {
  serviceId: string;
  serviceName: string;
  appointmentCount: number;
  revenue?: number;
}

export interface ClientStats {
  totalClients: number;
  newClients: number;
  returningClients: number;
  frequentClients: Client[];
}
