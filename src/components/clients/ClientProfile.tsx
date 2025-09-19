import React, { useState, useMemo } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { notificationService } from '../../utils/notificationService';
import type { DigitalRecord } from '../../types';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { RecordModal } from '../records/RecordModal';

interface ClientProfileProps {
  clientId: string;
  onClose: () => void;
}

export const ClientProfile: React.FC<ClientProfileProps> = ({ clientId, onClose }) => {
  const { currentUser, currentBusiness } = useAuth();
  const { canCreateRecord, canEditRecord, canDeleteRecord } = usePermissions();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;

  const { 
    clients, 
    digitalRecords, 
    services,
    deleteDigitalRecord,
    loading 
  } = useBusinessData(businessId || undefined);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DigitalRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const recordsPerPage = 10;

  // Encontrar el cliente actual
  const client = useMemo(() => {
    return clients.find(c => c.id === clientId);
  }, [clients, clientId]);

  // Filtrar registros del cliente actual
  const clientRecords = useMemo(() => {
    return digitalRecords.filter(record => record.clientId === clientId);
  }, [digitalRecords, clientId]);

  // Aplicar filtros y búsqueda
  const filteredRecords = useMemo(() => {
    let filtered = clientRecords;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.treatment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.diagnosis && record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por tipo de tratamiento
    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.serviceId === filterType);
    }

    // Ordenar por fecha (más reciente primero)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clientRecords, searchTerm, filterType]);

  // Paginación
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredRecords.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredRecords, currentPage, recordsPerPage]);

  // Obtener tipos de tratamiento únicos para el filtro
  const treatmentTypes = useMemo(() => {
    const types = new Set(clientRecords.map(record => record.serviceId));
    return Array.from(types).map(serviceId => {
      const service = services.find(s => s.id === serviceId);
      return { id: serviceId, name: service?.name || 'Servicio desconocido' };
    });
  }, [clientRecords, services]);

  const handleNewRecord = () => {
    setSelectedRecord(null);
    setIsRecordModalOpen(true);
  };

  const handleEditRecord = (record: DigitalRecord) => {
    setSelectedRecord(record);
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteDigitalRecord(recordId);
      setShowDeleteConfirm(null);
      
      // Enviar notificación
      if (client && businessId) {
        await notificationService.createRecordNotification(
          businessId,
          client.name,
          'deleted',
          currentUser!.uid
        );
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleRecordSaved = async () => {
    setIsRecordModalOpen(false);
    setSelectedRecord(null);
    
    // Enviar notificación
    if (client && businessId) {
      await notificationService.createRecordNotification(
        businessId,
        client.name,
        selectedRecord ? 'updated' : 'created',
        currentUser!.uid
      );
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Servicio desconocido';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil del cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Cliente no encontrado</h3>
          </div>
          <p className="text-gray-600 mb-4">No se pudo encontrar el cliente solicitado.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-600 to-pink-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-8 w-8 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold">{client.name}</h2>
                  <p className="text-pink-100">Perfil del Cliente</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-120px)]">
            {/* Información del Cliente */}
            <div className="lg:w-1/3 bg-gray-50 p-6 border-r">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{client.name}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>

                {client.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{client.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Cliente desde</p>
                    <p className="font-medium">
                      {format(parseISO(client.createdAt), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Total de Registros</p>
                    <p className="font-medium text-pink-600">{clientRecords.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registros del Cliente */}
            <div className="lg:w-2/3 flex flex-col">
              {/* Controles */}
              <div className="p-6 border-b bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Expedientes Digitales ({filteredRecords.length})
                  </h3>
                  
                  {canCreateRecord && (
                    <button
                      onClick={handleNewRecord}
                      className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Registro
                    </button>
                  )}
                </div>

                {/* Filtros y Búsqueda */}
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar en registros..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">Todos los tratamientos</option>
                      {treatmentTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista de Registros */}
              <div className="flex-1 overflow-y-auto p-6">
                {paginatedRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm || filterType !== 'all' ? 'No se encontraron registros' : 'Sin registros'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm || filterType !== 'all' 
                        ? 'Intenta ajustar los filtros de búsqueda'
                        : 'Este cliente aún no tiene registros en su expediente'
                      }
                    </p>
                    {canCreateRecord && !searchTerm && filterType === 'all' && (
                      <button
                        onClick={handleNewRecord}
                        className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Registro
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedRecords.map((record) => (
                      <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-500">
                                {format(parseISO(record.date), 'dd/MM/yyyy', { locale: es })}
                              </span>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="text-sm font-medium text-pink-600">
                                {getServiceName(record.serviceId)}
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-gray-900 mb-2">{record.treatment}</h4>
                            
                            {record.diagnosis && (
                              <p className="text-sm text-gray-600 mb-2">
                                <strong>Diagnóstico:</strong> {record.diagnosis}
                              </p>
                            )}
                            
                            <p className="text-sm text-gray-600 line-clamp-2">{record.notes}</p>
                            
                            {record.duration && (
                              <div className="mt-2 flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Duración: {record.duration} minutos
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {canEditRecord && (
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                                title="Editar registro"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            
                            {canDeleteRecord && (
                              <button
                                onClick={() => setShowDeleteConfirm(record.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Mostrando {((currentPage - 1) * recordsPerPage) + 1} a {Math.min(currentPage * recordsPerPage, filteredRecords.length)} de {filteredRecords.length} registros
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      
                      <span className="px-3 py-1 text-sm font-medium">
                        {currentPage} de {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      {isRecordModalOpen && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          record={selectedRecord}
          clientId={clientId}
          onSave={handleRecordSaved}
        />
      )}

      {/* Confirmación de Eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteRecord(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
