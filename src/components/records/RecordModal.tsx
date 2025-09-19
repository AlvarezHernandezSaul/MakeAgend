import React, { useState, useEffect } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import type { DigitalRecord } from '../../types';
import { X, Save, Calendar, FileText, Clock, AlertCircle } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: DigitalRecord | null;
  clientId?: string; // Opcional - si se proporciona, preselecciona el cliente
  onSave?: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  record,
  clientId,
  onSave
}) => {
  const { currentUser, currentBusiness } = useAuth();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
    
  const { addDigitalRecord, updateDigitalRecord, addAppointment, services, clients } = useBusinessData(businessId || undefined);

  const [formData, setFormData] = useState({
    clientId: clientId || '',
    serviceId: '',
    treatment: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    diagnosis: '',
    duration: '',
    followUpDate: ''
  });
  
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtrar clientes según búsqueda
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.phone.includes(clientSearchTerm) ||
    (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()))
  );

  // Cargar datos del registro si estamos editando
  useEffect(() => {
    if (record) {
      setFormData({
        clientId: record.clientId || '',
        serviceId: record.serviceId || '',
        treatment: record.treatment || '',
        date: record.date || new Date().toISOString().split('T')[0],
        notes: record.notes || '',
        diagnosis: record.diagnosis || '',
        duration: record.duration?.toString() || '',
        followUpDate: ''
      });
    } else {
      // Reset form for new record
      setFormData({
        clientId: clientId || '',
        serviceId: '',
        treatment: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        diagnosis: '',
        duration: '',
        followUpDate: ''
      });
    }
  }, [record, clientId]);

  // Preseleccionar cliente y actualizar término de búsqueda
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === clientId);
      if (selectedClient) {
        setClientSearchTerm(selectedClient.name);
        setShowClientDropdown(false); // No mostrar dropdown cuando se preselecciona
      }
    }
  }, [clientId, clients]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const createFollowUpAppointment = async () => {
    if (!formData.followUpDate || !businessId) return;

    try {
      // Buscar el servicio para obtener la duración
      const service = services.find(s => s.id === formData.serviceId);
      const duration = formData.duration ? parseInt(formData.duration) : service?.duration || 60;

      // Usar la fecha seleccionada por el usuario
      const appointmentData = {
        clientId: formData.clientId,
        serviceId: formData.serviceId,
        date: formData.followUpDate,
        startTime: '10:00',
        endTime: `${Math.floor((600 + duration) / 60)}:${String((600 + duration) % 60).padStart(2, '0')}`,
        status: 'pending' as const,
        notes: `Seguimiento de: ${formData.treatment}`,
        createdBy: currentUser!.uid,
        businessId: businessId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addAppointment(appointmentData);
    } catch (error) {
      console.error('Error creating follow-up appointment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.treatment.trim() || !formData.serviceId || !formData.clientId) {
        setError('Cliente, tratamiento y servicio son requeridos');
        setLoading(false);
        return;
      }

      const recordData = {
        clientId: formData.clientId,
        serviceId: formData.serviceId,
        treatment: formData.treatment.trim(),
        date: formData.date,
        notes: formData.notes.trim(),
        diagnosis: formData.diagnosis.trim(),
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        businessId: businessId!,
        createdBy: currentUser!.uid,
        createdAt: record?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (record) {
        // Actualizar registro existente
        await updateDigitalRecord(record.id, recordData);
      } else {
        // Crear nuevo registro
        await addDigitalRecord(recordData);
        
        // Crear cita de seguimiento si hay fecha seleccionada
        await createFollowUpAppointment();
      }

      onSave?.();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-pink-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-2" />
              <div>
                <h2 className="text-xl font-bold">
                  {record ? 'Editar Registro' : 'Nuevo Registro'}
                </h2>
                <p className="text-pink-100">
                  {formData.clientId 
                    ? `Cliente: ${clients.find(c => c.id === formData.clientId)?.name || 'Cliente seleccionado'}`
                    : 'Seleccione un cliente'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setClientSearchTerm(value);
                    setShowClientDropdown(true);
                    
                    // Si el usuario borra el texto, limpiar la selección
                    if (!value.trim()) {
                      setFormData(prev => ({ ...prev, clientId: '' }));
                    }
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                {showClientDropdown && clientSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, clientId: client.id }));
                            setClientSearchTerm(client.name);
                            setShowClientDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.phone}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500">No se encontraron clientes</div>
                    )}
                  </div>
                )}
              </div>
              {formData.clientId ? (
                <p className="mt-1 text-sm text-green-600">✓ Cliente seleccionado</p>
              ) : (
                <p className="mt-1 text-sm text-red-600">Seleccione un cliente</p>
              )}
            </div>

            {/* Servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servicio *
              </label>
              <select
                name="serviceId"
                value={formData.serviceId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Seleccionar servicio</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tratamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tratamiento Realizado *
            </label>
            <input
              type="text"
              name="treatment"
              value={formData.treatment}
              onChange={handleInputChange}
              required
              placeholder="Ej: Corte de cabello, Manicure, Facial..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnóstico
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleInputChange}
              rows={3}
              placeholder="Observaciones sobre el estado inicial del cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas del Tratamiento
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Detalles del procedimiento, productos utilizados, recomendaciones..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Duración */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Duración (minutos)
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                max="480"
                placeholder="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* Seguimiento */}
            {!record && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de cita de seguimiento (opcional)
                </label>
                <input
                  type="date"
                  name="followUpDate"
                  value={formData.followUpDate}
                  onChange={handleInputChange}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // Mínimo mañana
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Selecciona una fecha para programar automáticamente una cita de seguimiento
                </p>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
              className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
