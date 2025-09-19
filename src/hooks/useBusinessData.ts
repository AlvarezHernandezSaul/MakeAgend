import { useState, useEffect } from 'react';
import { ref, set, push, update, remove, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';
import type { Business, Service, Client, Appointment, DigitalRecord } from '../types';
import { realTimeLicenseService } from '../utils/realTimeLicenseService';

export const useBusinessData = (businessId: string | undefined) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [digitalRecords, setDigitalRecords] = useState<DigitalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función helper para verificar licencias antes de acciones de escritura
  const checkLicenseBeforeAction = async (): Promise<boolean> => {
    if (!businessId) return false;
    
    try {
      const licenseStatus = await realTimeLicenseService.checkBusinessLicense(businessId);
      if (!licenseStatus.isValid) {
        const message = licenseStatus.isExpired 
          ? 'No se puede realizar esta acción. La licencia ha expirado.'
          : 'No se puede realizar esta acción. La licencia no está activa.';
        setError(message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking license:', error);
      setError('Error verificando licencia');
      return false;
    }
  };

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const businessRef = ref(database, `businesses/${businessId}`);
    const servicesRef = ref(database, `businesses/${businessId}/services`);
    const clientsRef = ref(database, `businesses/${businessId}/clients`);
    const appointmentsRef = ref(database, `businesses/${businessId}/appointments`);
    const digitalRecordsRef = ref(database, `businesses/${businessId}/digitalRecords`);

    // Set up real-time listeners
    const unsubscribeBusiness = onValue(businessRef, (snapshot) => {
      if (snapshot.exists()) {
        setBusiness({ id: businessId, ...snapshot.val() });
      }
    });

    const unsubscribeServices = onValue(servicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const servicesData = snapshot.val();
        const servicesList = Object.keys(servicesData).map(key => ({
          id: key,
          ...servicesData[key]
        }));
        setServices(servicesList);
      } else {
        setServices([]);
      }
    });

    const unsubscribeClients = onValue(clientsRef, (snapshot) => {
      if (snapshot.exists()) {
        const clientsData = snapshot.val();
        const clientsList = Object.keys(clientsData).map(key => ({
          id: key,
          ...clientsData[key]
        }));
        setClients(clientsList);
      } else {
        setClients([]);
      }
    });

    const unsubscribeAppointments = onValue(appointmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const appointmentsData = snapshot.val();
        const appointmentsList = Object.keys(appointmentsData).map(key => ({
          id: key,
          ...appointmentsData[key]
        }));
        setAppointments(appointmentsList);
      } else {
        setAppointments([]);
      }
    });

    const unsubscribeDigitalRecords = onValue(digitalRecordsRef, (snapshot) => {
      if (snapshot.exists()) {
        const recordsData = snapshot.val();
        const recordsList = Object.keys(recordsData).map(key => ({
          id: key,
          ...recordsData[key]
        }));
        setDigitalRecords(recordsList);
      } else {
        setDigitalRecords([]);
      }
      setLoading(false);
    });

    return () => {
      off(businessRef, 'value', unsubscribeBusiness);
      off(servicesRef, 'value', unsubscribeServices);
      off(clientsRef, 'value', unsubscribeClients);
      off(appointmentsRef, 'value', unsubscribeAppointments);
      off(digitalRecordsRef, 'value', unsubscribeDigitalRecords);
    };
  }, [businessId]);


  const updateBusiness = async (updates: Partial<Business>) => {
    if (!businessId) return;
    try {
      const businessRef = ref(database, `businesses/${businessId}`);
      await update(businessRef, updates);
    } catch (error) {
      setError('Error updating business');
      throw error;
    }
  };

  const addService = async (service: Omit<Service, 'id'>) => {
    if (!businessId) return;
    
    // Verificar licencia antes de la acción
    const canProceed = await checkLicenseBeforeAction();
    if (!canProceed) {
      throw new Error('No se puede agregar el servicio. Verifique el estado de su licencia.');
    }
    
    try {
      const servicesRef = ref(database, `businesses/${businessId}/services`);
      const newServiceRef = push(servicesRef);
      await set(newServiceRef, service);
      return newServiceRef.key;
    } catch (error) {
      setError('Error al agregar servicio');
      throw error;
    }
  };

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    if (!businessId) return;
    
    // Verificar licencia antes de la acción
    const canProceed = await checkLicenseBeforeAction();
    if (!canProceed) {
      throw new Error('No se puede actualizar el servicio. Verifique el estado de su licencia.');
    }
    
    try {
      const serviceRef = ref(database, `businesses/${businessId}/services/${serviceId}`);
      await update(serviceRef, updates);
    } catch (error) {
      setError('Error al actualizar servicio');
      throw error;
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!businessId) return;
    
    // Verificar licencia antes de la acción
    const canProceed = await checkLicenseBeforeAction();
    if (!canProceed) {
      throw new Error('No se puede eliminar el servicio. Verifique el estado de su licencia.');
    }
    
    try {
      const serviceRef = ref(database, `businesses/${businessId}/services/${serviceId}`);
      await remove(serviceRef);
    } catch (error) {
      setError('Error al eliminar servicio');
      throw error;
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    if (!businessId) return;
    
    // Verificar licencia antes de la acción
    const canProceed = await checkLicenseBeforeAction();
    if (!canProceed) {
      throw new Error('No se puede agregar el cliente. Verifique el estado de su licencia.');
    }
    
    try {
      const clientsRef = ref(database, `businesses/${businessId}/clients`);
      const newClientRef = push(clientsRef);
      await set(newClientRef, { ...client, businessId });
      return newClientRef.key;
    } catch (error) {
      setError('Error adding client');
      throw error;
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!businessId) return;
    try {
      const clientRef = ref(database, `businesses/${businessId}/clients/${clientId}`);
      await update(clientRef, updates);
    } catch (error) {
      setError('Error al actualizar cliente');
      throw error;
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!businessId) return;
    try {
      const clientRef = ref(database, `businesses/${businessId}/clients/${clientId}`);
      await remove(clientRef);
    } catch (error) {
      setError('Error al eliminar cliente');
      throw error;
    }
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    if (!businessId) return;
    
    // Verificar licencia antes de la acción
    const canProceed = await checkLicenseBeforeAction();
    if (!canProceed) {
      throw new Error('No se puede crear la cita. Verifique el estado de su licencia.');
    }
    
    try {
      const appointmentsRef = ref(database, `businesses/${businessId}/appointments`);
      const newAppointmentRef = push(appointmentsRef);
      await set(newAppointmentRef, { ...appointment, businessId });
      return newAppointmentRef.key;
    } catch (error) {
      setError('Error adding appointment');
      throw error;
    }
  };

  const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
    if (!businessId) return;
    try {
      const appointmentRef = ref(database, `businesses/${businessId}/appointments/${appointmentId}`);
      await update(appointmentRef, updates);
    } catch (error) {
      setError('Error updating appointment');
      throw error;
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!businessId) return;
    try {
      const appointmentRef = ref(database, `businesses/${businessId}/appointments/${appointmentId}`);
      await remove(appointmentRef);
    } catch (error) {
      setError('Error deleting appointment');
      throw error;
    }
  };

  const addDigitalRecord = async (record: Omit<DigitalRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!businessId) {
      throw new Error('No se ha seleccionado un negocio');
    }
    
    // Verificar licencia antes de la acción
    const canProceed = await checkLicenseBeforeAction();
    if (!canProceed) {
      throw new Error('No se puede crear el expediente. Verifique el estado de su licencia.');
    }
    
    try {
      const timestamp = new Date().toISOString();
      const recordWithTimestamps = {
        ...record,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const recordsRef = ref(database, `businesses/${businessId}/digitalRecords`);
      const newRecordRef = push(recordsRef);
      
      if (!newRecordRef.key) {
        throw new Error('No se pudo generar una clave para el registro');
      }
      
      await set(newRecordRef, recordWithTimestamps);
      
      return {
        id: newRecordRef.key,
        ...recordWithTimestamps
      };
    } catch (error) {
      setError('Error adding digital record');
      throw error;
    }
  };

  const updateDigitalRecord = async (recordId: string, updates: Partial<DigitalRecord>) => {
    if (!businessId) {
      throw new Error('No se ha seleccionado un negocio');
    }
    
    try {
      const recordRef = ref(database, `businesses/${businessId}/digitalRecords/${recordId}`);
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // No permitir modificar ciertos campos
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;
      
      await update(recordRef, updateData);
    } catch (error) {
      setError('Error updating digital record');
      throw error;
    }
  };

  const deleteDigitalRecord = async (recordId: string) => {
    if (!businessId) {
      throw new Error('No se ha seleccionado un negocio');
    }
    
    try {
      const recordRef = ref(database, `businesses/${businessId}/digitalRecords/${recordId}`);
      await remove(recordRef);
    } catch (error) {
      setError('Error deleting digital record');
      throw error;
    }
  };

  return {
    business,
    services,
    clients,
    appointments,
    digitalRecords,
    loading,
    error,
    updateBusiness,
    addService,
    updateService,
    deleteService,
    addClient,
    updateClient,
    deleteClient,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addDigitalRecord,
    updateDigitalRecord,
    deleteDigitalRecord
  };
};
