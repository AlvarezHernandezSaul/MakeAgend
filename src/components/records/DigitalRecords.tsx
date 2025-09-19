import React, { useState } from 'react';
import { useBusinessData } from '../../hooks/useBusinessData';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { DigitalRecord, BusinessCategory } from '../../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  Edit,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RecordModal } from './RecordModal';

export const DigitalRecords: React.FC = () => {
  const { currentUser, currentBusiness } = useAuth();
  const { canCreateRecord, canEditRecord, canDeleteRecord, getRestrictionMessage } = usePermissions();
  
  // Determinar el businessId según el rol del usuario
  const businessId = currentUser?.role === 'owner' 
    ? currentUser?.businessId 
    : currentBusiness;
  
  const { clients, digitalRecords, loading, deleteDigitalRecord } = useBusinessData(businessId || undefined);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DigitalRecord | null>(null);

  const filteredRecords = digitalRecords.filter(record => {
    const client = clients.find(c => c.id === record.clientId);
    const matchesClient = !selectedClient || record.clientId === selectedClient;
    const matchesSearch = !searchTerm || 
      (client?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      JSON.stringify(record.data).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesClient && matchesSearch;
  });

  const handleNewRecord = () => {
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const handleViewRecord = (record: DigitalRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: DigitalRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (record: DigitalRecord) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este expediente? Esta acción no se puede deshacer.')) {
      try {
        await deleteDigitalRecord(record.id);
      } catch (error) {
        console.error('Error al eliminar el expediente:', error);
        alert('Error al eliminar el expediente. Por favor, inténtalo de nuevo.');
      }
    }
  };

  const getRecordTypeLabel = (businessCategory: BusinessCategory) => {
    switch (businessCategory) {
      case 'dermatology':
        return 'Consulta Dermatológica';
      case 'acupuncture':
        return 'Sesión de Acupuntura';
      case 'physiotherapy':
        return 'Sesión de Fisioterapia';
      case 'nails':
        return 'Servicio de Uñas';
      case 'massage':
        return 'Sesión de Masaje';
      case 'beauty':
        return 'Tratamiento Estético';
      case 'other':
        return 'Consulta Especializada';
      case 'nutrition':
        return 'Consulta Nutricional';
      case 'psychology':
        return 'Sesión de Terapia';
      case 'dentistry':
        return 'Consulta Dental';
      case 'hair':
        return 'Servicio de Peluquería';
      case 'barbershop':
        return 'Servicio de Barbería';
      case 'yoga':
        return 'Clase de Yoga/Pilates';
      case 'fitness':
        return 'Entrenamiento Personal';
      case 'veterinary':
        return 'Consulta Veterinaria';
      case 'consulting':
        return 'Consultoría';
      case 'education':
        return 'Sesión Educativa';
      default:
        return 'Registro';
    }
  };

  const renderRecordDetails = (record: DigitalRecord) => {
    const data = record.data || {};
    
    switch (record.category) {
      case 'dermatology':
        return (
          <div className="text-sm text-gray-600">
            <p><strong>Diagnóstico:</strong> {data.diagnosis || 'N/A'}</p>
            <p><strong>Tratamiento:</strong> {data.treatment || 'N/A'}</p>
          </div>
        );
      case 'acupuncture':
        return (
          <div className="text-sm text-gray-600">
            <p><strong>Puntos:</strong> {data.acupuncturePoints?.join(', ') || 'N/A'}</p>
            <p><strong>Síntomas:</strong> {data.symptomsAddressed || 'N/A'}</p>
          </div>
        );
      case 'physiotherapy':
        return (
          <div className="text-sm text-gray-600">
            <p><strong>Terapia:</strong> {data.therapyType || 'N/A'}</p>
            <p><strong>Progreso:</strong> {data.patientProgress || 'N/A'}</p>
          </div>
        );
      case 'nails':
        return (
          <div className="text-sm text-gray-600">
            <p><strong>Servicio:</strong> {data.serviceType || 'N/A'}</p>
            <p><strong>Preferencias:</strong> {data.preferences || 'N/A'}</p>
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-600">
            <p>Registro personalizado</p>
          </div>
        );
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-pink-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Expedientes Digitales</h1>
        </div>
        {canCreateRecord && (
          <button
            onClick={handleNewRecord}
            className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Registro
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en registros..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500 appearance-none"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <FileText className="h-4 w-4 mr-2" />
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedClient ? 'No se encontraron registros' : 'No hay registros creados'}
          </p>
          {!searchTerm && !selectedClient && (
            <button
              onClick={handleNewRecord}
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              Crear el primer registro
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {filteredRecords.map((record) => {
              const client = clients.find(c => c.id === record.clientId);
              
              return (
                <div key={record.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">
                          {client?.name || 'Cliente desconocido'}
                        </h3>
                        <span className="ml-3 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                          {getRecordTypeLabel(record.category || 'beauty')}
                        </span>
                      </div>

                      <div className="flex items-center mb-3 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(record.date), 'dd MMM yyyy', { locale: es })}
                        <span className="mx-2">•</span>
                        Creado por: {record.createdBy}
                      </div>

                      {renderRecordDetails(record)}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewRecord(record)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Ver registro"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {canEditRecord ? (
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Editar registro"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      ) : (
                        <div 
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title={getRestrictionMessage('canEditRecord')}
                        >
                          <Edit className="h-4 w-4" />
                        </div>
                      )}
                      
                      {canDeleteRecord ? (
                        <button
                          onClick={() => handleDeleteRecord(record)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Eliminar registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div 
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title={getRestrictionMessage('canDeleteRecord')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </div>
                      )}
                      
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Descargar registro"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Record Modal */}
      <RecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        onSave={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
};

export default DigitalRecords;
