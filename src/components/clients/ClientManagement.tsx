import React, { useState } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { Client } from '../../types';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  X, 
  Phone, 
  Mail, 
  Calendar,
  FileText,
  AlertCircle,
  Trash2,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClientProfile } from './ClientProfile';

export const ClientManagement: React.FC = () => {
  const { currentUser, currentBusiness } = useAuth();
  const { canCreateClient, canEditClient, canDeleteClient, getRestrictionMessage } = usePermissions();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
  
  const { clients, appointments, addClient, updateClient, deleteClient, loading } = useBusinessData(businessId || undefined);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showClientProfile, setShowClientProfile] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    allergies: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; client: Client | null }>({ isOpen: false, client: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getClientAppointments = (clientId: string) => {
    return appointments.filter(apt => apt.clientId === clientId);
  };

  const getLastAppointment = (clientId: string) => {
    const clientAppointments = getClientAppointments(clientId);
    if (clientAppointments.length === 0) return null;
    
    return clientAppointments
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const handleNewClient = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      age: '',
      allergies: '',
      notes: ''
    });
    setSelectedClient(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      age: client.age?.toString() || '',
      allergies: client.allergies?.join(', ') || '',
      notes: client.notes || ''
    });
    setSelectedClient(client);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setDeleteConfirm({ isOpen: true, client });
  };

  const confirmDeleteClient = async () => {
    if (!deleteConfirm.client) return;
    
    setDeleteLoading(true);
    try {
      await deleteClient(deleteConfirm.client.id);
      setDeleteConfirm({ isOpen: false, client: null });
    } catch (error: any) {
      setError(error.message || 'Error al eliminar cliente');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaveLoading(true);

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Nombre y teléfono son requeridos');
      setSaveLoading(false);
      return;
    }

    try {
      const clientData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()).filter(a => a) : [],
        businessId: currentUser!.businessId!,
        updatedAt: new Date().toISOString()
      };

      // Only add optional fields if they have values
      const trimmedEmail = formData.email.trim();
      if (trimmedEmail) {
        clientData.email = trimmedEmail;
      }

      const parsedAge = formData.age ? parseInt(formData.age) : null;
      if (parsedAge) {
        clientData.age = parsedAge;
      }

      const trimmedNotes = formData.notes.trim();
      if (trimmedNotes) {
        clientData.notes = trimmedNotes;
      }

      if (selectedClient) {
        await updateClient(selectedClient.id, clientData);
      } else {
        await addClient({
          ...clientData,
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      setSelectedClient(null);
    } catch (error: any) {
      setError(error.message || 'Error al guardar cliente');
    } finally {
      setSaveLoading(false);
    }
  };

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
          <Users className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
        </div>
        {canCreateClient && (
          <button
            onClick={handleNewClient}
            className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-600">{clients.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Con Citas</p>
              <p className="text-2xl font-bold text-green-600">
                {clients.filter(client => getClientAppointments(client.id).length > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Con Alergias</p>
              <p className="text-2xl font-bold text-purple-600">
                {clients.filter(client => client.allergies && client.allergies.length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Clientes ({filteredClients.length})
          </h2>
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleNewClient}
                className="mt-4 text-pink-600 hover:text-pink-700 font-medium"
              >
                Agregar el primer cliente
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredClients.map((client) => {
              const lastAppointment = getLastAppointment(client.id);
              const appointmentCount = getClientAppointments(client.id).length;

              return (
                <div key={client.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                        {client.allergies && client.allergies.length > 0 && (
                          <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
                        )}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {client.phone}
                        </div>
                        {client.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {client.email}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {appointmentCount} cita{appointmentCount !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {lastAppointment && (
                        <p className="mt-1 text-sm text-gray-500">
                          Última cita: {format(new Date(lastAppointment.date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      )}

                      {client.allergies && client.allergies.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-red-600">
                            <strong>Alergias:</strong> {client.allergies.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Ver detalles"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => setShowClientProfile(client.id)}
                        className="p-2 text-gray-400 hover:text-pink-600"
                        title="Ver perfil y expedientes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {canEditClient ? (
                        <button
                          onClick={() => handleEditClient(client)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      ) : (
                        <div 
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title={getRestrictionMessage('canEditClient')}
                        >
                          <Edit className="h-4 w-4" />
                        </div>
                      )}
                      
                      {canDeleteClient ? (
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div 
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title={getRestrictionMessage('canDeleteClient')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 rounded-full p-3 mr-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                  <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que deseas eliminar al cliente <strong>{deleteConfirm.client?.name}</strong>?
                {getClientAppointments(deleteConfirm.client?.id || '').length > 0 && (
                  <span className="block mt-2 text-sm text-amber-600">
                    ⚠️ Este cliente tiene {getClientAppointments(deleteConfirm.client?.id || '').length} cita(s) registrada(s).
                  </span>
                )}
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: false, client: null })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteClient}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedClient && !isEditing ? 'Detalles del Cliente' : 
                 selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedClient && !isEditing ? (
              // View Mode
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Nombre</p>
                        <p className="text-gray-900">{selectedClient.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Teléfono</p>
                        <p className="text-gray-900">{selectedClient.phone}</p>
                      </div>
                      {selectedClient.email && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Email</p>
                          <p className="text-gray-900">{selectedClient.email}</p>
                        </div>
                      )}
                      {selectedClient.age && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Edad</p>
                          <p className="text-gray-900">{selectedClient.age} años</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Información Médica</h3>
                    <div className="space-y-3">
                      {selectedClient.allergies && selectedClient.allergies.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Alergias</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedClient.allergies.map((allergy, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                              >
                                {allergy}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Sin alergias registradas</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Notas</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{selectedClient.notes}</p>
                  </div>
                )}

                {/* Appointment History */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de Citas</h3>
                  {getClientAppointments(selectedClient.id).length === 0 ? (
                    <p className="text-gray-500">No hay citas registradas</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getClientAppointments(selectedClient.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((appointment) => (
                          <div key={appointment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                            <div>
                              <p className="font-medium">{format(new Date(appointment.date), 'dd MMM yyyy', { locale: es })}</p>
                              <p className="text-sm text-gray-600">{appointment.startTime}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {appointment.status === 'completed' ? 'Completada' :
                               appointment.status === 'confirmed' ? 'Confirmada' :
                               appointment.status === 'pending' ? 'Pendiente' :
                               appointment.status === 'cancelled' ? 'Cancelada' : 'No asistió'}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ) : (
              // Edit/Create Mode
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Edad
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alergias (separadas por comas)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Níquel, Látex, Penicilina"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    rows={3}
                    placeholder="Información adicional sobre el cliente..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => selectedClient && !isEditing ? setIsModalOpen(false) : setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
                  >
                    {saveLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Client Profile Modal */}
      {showClientProfile && (
        <ClientProfile
          clientId={showClientProfile}
          onClose={() => setShowClientProfile(null)}
        />
      )}
    </div>
  );
};
