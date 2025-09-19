import React, { useState, useMemo } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { Service } from '../../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Users, 
  X, 
  Save,
  Scissors,
  DollarSign
} from 'lucide-react';

export const ServiceManagement: React.FC = () => {
  const { currentUser, currentBusiness } = useAuth();
  const { canCreateService, canEditService, canDeleteService, getRestrictionMessage } = usePermissions();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
  
  const { services, addService, updateService, deleteService, loading, error: hookError } = useBusinessData(businessId || undefined);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration: 60,
    category: '',
    resources: 1,
    notes: '',
    price: ''
  });
  const [showCustomNameField, setShowCustomNameField] = useState(false);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; service: Service | null }>({ isOpen: false, service: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleNewService = () => {
    setFormData({
      name: '',
      duration: 60,
      category: '',
      resources: 1,
      notes: '',
      price: ''
    });
    setShowCustomNameField(false);
    setSelectedService(null);
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setFormData({
      name: service.name,
      duration: service.duration,
      category: service.category,
      resources: service.resources,
      notes: service.notes || '',
      price: service.price ? service.price.toString() : ''
    });
    setShowCustomNameField(true);
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleDeleteService = (service: Service) => {
    setDeleteConfirm({ isOpen: true, service });
  };

  const confirmDeleteService = async () => {
    if (!deleteConfirm.service) return;
    
    setDeleteLoading(true);
    try {
      await deleteService(deleteConfirm.service.id);
      setDeleteConfirm({ isOpen: false, service: null });
      // Close edit modal if it's open for the deleted service
      if (selectedService?.id === deleteConfirm.service.id) {
        setIsModalOpen(false);
        setSelectedService(null);
      }
    } catch (error: any) {
      setError(error.message || 'Error al eliminar servicio');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaveLoading(true);

    try {
      const serviceData = {
        name: formData.name === 'custom' ? '' : formData.name,
        duration: formData.duration,
        category: formData.category,
        resources: formData.resources,
        notes: formData.notes,
        price: formData.price ? parseFloat(formData.price) : undefined,
        businessId: currentUser!.businessId!,
        isActive: true,
        createdAt: selectedService?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (selectedService) {
        await updateService(selectedService.id, serviceData);
      } else {
        await addService(serviceData);
      }

      closeModal();
    } catch (error: any) {
      setError(error.message || 'Error al guardar servicio');
    } finally {
      setSaveLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setFormData({
      name: '',
      duration: 60,
      category: '',
      resources: 1,
      notes: '',
      price: ''
    });
    setError('');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Filter only active services for display
  const activeServices = useMemo(() => {
    return services.filter(service => service.isActive);
  }, [services]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: activeServices.length,
      categories: [...new Set(activeServices.map(s => s.category).filter(Boolean))].length,
      avgDuration: activeServices.length > 0 
        ? Math.round(activeServices.reduce((sum, s) => sum + s.duration, 0) / activeServices.length)
        : 0,
      withPrice: activeServices.filter(s => s.price && s.price > 0).length
    };
  }, [activeServices]);

  const isEditing = selectedService !== null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Scissors className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h1>
        </div>
        {canCreateService ? (
          <button
            onClick={handleNewService}
            className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </button>
        ) : (
          <div className="flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed" title={getRestrictionMessage('canCreateService')}>
            <Plus className="h-4 w-4 mr-2" />
            Solo Lectura
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Scissors className="h-6 w-6 text-pink-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Servicios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Con Precio</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withPrice}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {hookError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{hookError}</p>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeServices.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            {/* Service Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  {service.category && (
                    <span className="inline-block px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full font-medium mt-1">
                      {service.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {canEditService ? (
                    <button
                      onClick={() => handleEditService(service)}
                      className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      title="Editar servicio"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  ) : (
                    <div 
                      className="p-2 text-gray-300 cursor-not-allowed rounded-lg"
                      title={getRestrictionMessage('canEditService')}
                    >
                      <Edit className="h-4 w-4" />
                    </div>
                  )}
                  
                  {canDeleteService ? (
                    <button
                      onClick={() => handleDeleteService(service)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div 
                      className="p-2 text-gray-300 cursor-not-allowed rounded-lg"
                      title={getRestrictionMessage('canDeleteService')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Body */}
            <div className="p-4 space-y-4">
              {/* Duration and Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-pink-500" />
                  <span className="text-sm font-medium">{formatDuration(service.duration)}</span>
                </div>
                {service.price && (
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">
                      ${service.price}
                    </span>
                  </div>
                )}
              </div>

              {/* Resources */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-2 text-pink-500" />
                  <span className="text-sm">
                    {service.resources} {service.resources === 1 ? 'recurso' : 'recursos'}
                  </span>
                </div>
                {service.resources === 1 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                    Exclusivo
                  </span>
                )}
              </div>

              {/* Notes */}
              {service.notes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Notas</p>
                  <p className="text-sm text-gray-700">{service.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {activeServices.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay servicios activos</h3>
            <p className="text-gray-600 mb-4">Comienza agregando tu primer servicio</p>
            <button
              onClick={handleNewService}
              className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Servicio
            </button>
          </div>
        )}
      </div>

      {/* Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Servicio *
                </label>
                <div className="space-y-2">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    value={showCustomNameField ? "custom" : (formData.name || "")}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setShowCustomNameField(false);
                        setFormData({ ...formData, name: e.target.value });
                      } else {
                        setShowCustomNameField(true);
                        setFormData({ ...formData, name: '' });
                      }
                    }}
                  >
                    <option value="">Seleccionar servicio predefinido</option>
                    {services.filter(service => !service.isActive).map((service) => (
                      <option key={service.id} value={service.name}>
                        {service.name} - {service.category}
                      </option>
                    ))}
                    <option value="custom">✏️ Escribir nombre personalizado</option>
                  </select>
                  
                  {(showCustomNameField || (formData.name && !services.some(s => s.name === formData.name))) && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        placeholder="Escribir nombre del servicio personalizado"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <input
                  type="text"
                  list="categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <datalist id="categories">
                  {[...new Set(services.map(s => s.category).filter(Boolean))].map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (minutos) *
                </label>
                <input
                  type="number"
                  required
                  min="15"
                  step="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                />
              </div>

              {/* Resources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recursos Necesarios *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  value={formData.resources}
                  onChange={(e) => setFormData({ ...formData, resources: parseInt(e.target.value) })}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio (opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  rows={3}
                  placeholder="Información adicional sobre el servicio..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ¿Eliminar servicio?
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar "{deleteConfirm.service?.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, service: null })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteService}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
