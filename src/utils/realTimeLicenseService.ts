import { ref, onValue, get } from 'firebase/database';
import { database } from '../config/firebase';
import type { BusinessLicense, User } from '../types';

export interface LicenseStatus {
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  license: BusinessLicense | null;
  businessId: string | null;
}

export class RealTimeLicenseService {
  private static instance: RealTimeLicenseService;
  private listeners: Map<string, () => void> = new Map();
  private licenseCallbacks: Map<string, (status: LicenseStatus) => void> = new Map();

  private constructor() {}

  static getInstance(): RealTimeLicenseService {
    if (!RealTimeLicenseService.instance) {
      RealTimeLicenseService.instance = new RealTimeLicenseService();
    }
    return RealTimeLicenseService.instance;
  }

  // Verificar si una licencia está expirada
  private isLicenseExpired(license: BusinessLicense | null): boolean {
    if (!license || !license.isActive) return true;
    return new Date() > new Date(license.endDate);
  }

  // Verificar si una licencia está próxima a expirar (3 días)
  private isLicenseExpiringSoon(license: BusinessLicense | null): boolean {
    if (!license || !license.isActive) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return new Date(license.endDate) <= threeDaysFromNow;
  }

  // Obtener días restantes de licencia
  private getDaysRemaining(license: BusinessLicense | null): number {
    if (!license || !license.isActive) return 0;
    const now = new Date();
    const endDate = new Date(license.endDate);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Verificar el estado de la licencia de un negocio
  async checkBusinessLicense(businessId: string): Promise<LicenseStatus> {
    try {
      const businessRef = ref(database, `businesses/${businessId}`);
      const snapshot = await get(businessRef);
      
      if (!snapshot.exists()) {
        return {
          isValid: false,
          isExpired: true,
          isExpiringSoon: false,
          daysRemaining: 0,
          license: null,
          businessId
        };
      }

      const business = snapshot.val();
      const license = business.license;
      const isActive = business.isActive !== false;

      const isExpired = this.isLicenseExpired(license);
      const isExpiringSoon = this.isLicenseExpiringSoon(license);
      const daysRemaining = this.getDaysRemaining(license);

      return {
        isValid: !isExpired && isActive && license?.isActive === true,
        isExpired,
        isExpiringSoon,
        daysRemaining,
        license,
        businessId
      };
    } catch (error) {
      console.error('Error checking business license:', error);
      return {
        isValid: false,
        isExpired: true,
        isExpiringSoon: false,
        daysRemaining: 0,
        license: null,
        businessId
      };
    }
  }

  // Verificar el estado de licencia de un usuario
  async checkUserLicenseStatus(user: User): Promise<LicenseStatus> {
    if (user.role === 'admin') {
      // Los admins no tienen restricciones de licencia
      return {
        isValid: true,
        isExpired: false,
        isExpiringSoon: false,
        daysRemaining: 999,
        license: null,
        businessId: null
      };
    }

    let businessId: string | null = null;

    // Determinar el businessId según el rol del usuario
    if (user.role === 'owner' && user.businessId) {
      businessId = user.businessId;
    } else if (user.role === 'assistant' && user.currentBusiness) {
      businessId = user.currentBusiness;
    }

    if (!businessId) {
      return {
        isValid: false,
        isExpired: true,
        isExpiringSoon: false,
        daysRemaining: 0,
        license: null,
        businessId: null
      };
    }

    return await this.checkBusinessLicense(businessId);
  }

  // Configurar listener en tiempo real para la licencia de un negocio
  setupBusinessLicenseListener(
    businessId: string, 
    callback: (status: LicenseStatus) => void
  ): () => void {
    const listenerId = `business_${businessId}`;
    
    // Limpiar listener anterior si existe
    this.removeLicenseListener(listenerId);

    const businessRef = ref(database, `businesses/${businessId}`);
    
    const unsubscribe = onValue(businessRef, (snapshot) => {
      if (snapshot.exists()) {
        const business = snapshot.val();
        const license = business.license;
        const isActive = business.isActive !== false;

        const isExpired = this.isLicenseExpired(license);
        const isExpiringSoon = this.isLicenseExpiringSoon(license);
        const daysRemaining = this.getDaysRemaining(license);

        const status: LicenseStatus = {
          isValid: !isExpired && isActive && license?.isActive === true,
          isExpired,
          isExpiringSoon,
          daysRemaining,
          license,
          businessId
        };

        callback(status);
      } else {
        // El negocio no existe
        callback({
          isValid: false,
          isExpired: true,
          isExpiringSoon: false,
          daysRemaining: 0,
          license: null,
          businessId
        });
      }
    });

    // Guardar el listener para poder limpiarlo después
    this.listeners.set(listenerId, unsubscribe);
    this.licenseCallbacks.set(listenerId, callback);

    // Retornar función para limpiar el listener
    return () => this.removeLicenseListener(listenerId);
  }

  // Configurar listener para un usuario (maneja múltiples negocios para asistentes)
  setupUserLicenseListener(
    user: User,
    callback: (status: LicenseStatus) => void
  ): () => void {
    if (user.role === 'admin') {
      // Los admins no necesitan verificación de licencia
      callback({
        isValid: true,
        isExpired: false,
        isExpiringSoon: false,
        daysRemaining: 999,
        license: null,
        businessId: null
      });
      return () => {}; // No-op cleanup function
    }

    let businessId: string | null = null;

    if (user.role === 'owner' && user.businessId) {
      businessId = user.businessId;
    } else if (user.role === 'assistant' && user.currentBusiness) {
      businessId = user.currentBusiness;
    }

    if (!businessId) {
      callback({
        isValid: false,
        isExpired: true,
        isExpiringSoon: false,
        daysRemaining: 0,
        license: null,
        businessId: null
      });
      return () => {};
    }

    return this.setupBusinessLicenseListener(businessId, callback);
  }

  // Remover listener específico
  private removeLicenseListener(listenerId: string): void {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
      this.licenseCallbacks.delete(listenerId);
    }
  }

  // Limpiar todos los listeners
  cleanup(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.licenseCallbacks.clear();
  }

  // Verificar si el usuario debe ser bloqueado inmediatamente
  async shouldBlockUser(user: User): Promise<boolean> {
    if (user.role === 'admin') return false;
    if (user.isBlocked) return true;

    const licenseStatus = await this.checkUserLicenseStatus(user);
    return !licenseStatus.isValid;
  }

  // Obtener información detallada de bloqueo
  async getBlockingReason(user: User): Promise<string> {
    if (user.isBlocked && user.blockedReason) {
      return user.blockedReason;
    }

    const licenseStatus = await this.checkUserLicenseStatus(user);
    
    if (!licenseStatus.isValid) {
      if (licenseStatus.isExpired) {
        return 'Su licencia ha expirado. Contacte al administrador para renovarla.';
      } else if (!licenseStatus.license) {
        return 'No tiene una licencia activa. Contacte al administrador.';
      } else {
        return 'Su cuenta ha sido desactivada. Contacte al administrador.';
      }
    }

    return 'Acceso restringido. Contacte al administrador.';
  }
}

export const realTimeLicenseService = RealTimeLicenseService.getInstance();
