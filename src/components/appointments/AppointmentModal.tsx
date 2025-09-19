import React, { useState, useEffect } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import type { Appointment } from '../../types';
import { X, Save, Trash2, Clock, User, Scissors, Calendar, AlertCircle } from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  selectedDate?: string | null;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  selectedDate
}) => {
  const { currentUser, currentBusiness } = useAuth();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
  
  const { 
    clients, 
    services, 
    appointments,
    addAppointment, 
    updateAppointment, 
    deleteAppointment,
    addClient 
  } = useBusinessData(businessId || undefined);

  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    date: selectedDate || '',
    startTime: '09:00',
    endTime: '10:00',
    status: 'pending' as Appointment['status'],
    notes: ''
  });

  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const [isNewClient, setIsNewClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (appointment) {
      setFormData({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes || ''
      });
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  }, [appointment, selectedDate]);

  useEffect(() => {
    // Auto-calculate end time when service changes
    if (formData.serviceId && formData.startTime) {
      const service = services.find(s => s.id === formData.serviceId);
      if (service) {
        const startTime = new Date(`2000-01-01T${formData.startTime}`);
        const endTime = addMinutes(startTime, service.duration);
        const endTimeString = format(endTime, 'HH:mm');
        setFormData(prev => ({ ...prev, endTime: endTimeString }));
      }
    }
  }, [formData.serviceId, formData.startTime, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check for resource conflicts before saving
      const conflicts = checkTimeConflicts();
      if (conflicts.length > 0) {
        const conflictClient = clients.find(c => c.id === conflicts[0].clientId);
        setError(`Conflicto de horario: Ya hay una cita programada con ${conflictClient?.name || 'otro cliente'} en este horario para este servicio.`);
        setLoading(false);
        return;
      }

      let clientId = formData.clientId;

      // Create new client if needed
      if (isNewClient) {
        if (!newClientData.name || !newClientData.phone) {
          setError('Nombre y teléfono son requeridos para el nuevo cliente');
          setLoading(false);
          return;
        }

        const newClientId = await addClient({
          name: newClientData.name,
          phone: newClientData.phone,
          email: newClientData.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          businessId: businessId!
        });
        if (newClientId) {
          clientId = newClientId;
        }
      }

      const appointmentData = {
        ...formData,
        clientId,
        createdBy: currentUser!.uid,
        businessId: businessId!,
        createdAt: appointment?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (appointment) {
        await updateAppointment(appointment.id, appointmentData);
      } else {
        await addAppointment(appointmentData);
      }

      onClose();
    } catch (error: any) {
      setError(error.message || 'Error al guardar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    
    setLoading(true);
    try {
      await deleteAppointment(appointment.id);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error al eliminar la cita');
    } finally {
      setLoading(false);
    }
  };

  const checkTimeConflicts = () => {
    if (!formData.serviceId || !formData.date || !formData.startTime || !formData.endTime) return [];
    
    const service = services.find(s => s.id === formData.serviceId);
    if (!service || service.resources > 1) return []; // Only check conflicts for single-resource services

    // Use appointments from the hook already available in the component
    
    // Convert times to minutes for easier comparison
    const startMinutes = timeToMinutes(formData.startTime);
    const endMinutes = timeToMinutes(formData.endTime);
    
    // Find conflicting appointments on the same date for the same service
    const conflictingAppointments = appointments.filter((apt: Appointment) => {
      // Skip the current appointment if editing
      if (appointment && apt.id === appointment.id) return false;
      
      // Only check appointments for the same service and date
      if (apt.serviceId !== formData.serviceId || apt.date !== formData.date) return false;
      
      // Skip cancelled appointments
      if (apt.status === 'cancelled') return false;
      
      const aptStartMinutes = timeToMinutes(apt.startTime);
      const aptEndMinutes = timeToMinutes(apt.endTime);
      
      // Check for time overlap
      return (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes);
    });
    
    return conflictingAppointments;
  };

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Cliente
            </label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isNewClient}
                    onChange={() => setIsNewClient(false)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Cliente existente</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isNewClient}
                    onChange={() => setIsNewClient(true)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nuevo cliente</span>
                </label>
              </div>

              {!isNewClient ? (
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.phone}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nombre completo *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono *"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Scissors className="h-4 w-4 inline mr-1" />
              Servicio
            </label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              value={formData.serviceId}
              onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
            >
              <option value="">Seleccionar servicio</option>
              {services.filter(service => service.isActive).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration} min) - {service.category}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Hora Inicio
              </label>
              <input
                type="time"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Hora Fin
              </label>
              <input
                type="time"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Appointment['status'] })}
            >
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
              <option value="no-show">No asistió</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Adicionales
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              rows={3}
              placeholder="Notas sobre la cita..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              {appointment && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ¿Eliminar cita?
              </h3>
              <p className="text-gray-600 mb-6">
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta cita?
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
