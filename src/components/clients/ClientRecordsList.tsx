import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Client, BusinessCategory } from '../../types';
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  Filter,
  Search,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientRecordsListProps {
  client: Client;
  businessId: string;
  businessCategory: BusinessCategory;
}

const ClientRecordsList: React.FC<ClientRecordsListProps> = ({
  client,
  businessId
}) => {
  const { getClientRecords, deleteClientRecord } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadRecords();
  }, [client.id, businessId]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const clientRecords = await getClientRecords(businessId, client.id);
      setRecords(clientRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      try {
        await deleteClientRecord(businessId, recordId);
        await loadRecords();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error al eliminar el registro');
      }
    }
  };

  const renderRecordContent = (record: any) => {
    switch (record.category) {
      case 'dermatology':
        return (
          <div>
            <p><strong>Diagnóstico:</strong> {record.diagnosis || 'No especificado'}</p>
            <p><strong>Tratamiento:</strong> {record.treatment || 'No especificado'}</p>
            <p><strong>Medicamentos:</strong> {record.medications || 'No especificados'}</p>
          </div>
        );
      case 'nails':
        return (
          <div>
            <p><strong>Tipo de servicio:</strong> {record.serviceType || 'No especificado'}</p>
            <p><strong>Preferencias:</strong> {record.preferences || 'No especificadas'}</p>
          </div>
        );
      default:
        return <p>{record.notes || 'Sin notas adicionales'}</p>;
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      record.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.treatment?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterType || record.category === filterType;
    return matchesSearch && matchesFilter;
  });

  const getRecordTypeLabel = (category: string) => {
    const labels: Record<string, string> = {
      'dermatology': 'Dermatología',
      'nails': 'Uñas',
      'nutrition': 'Nutrición',
      'psychology': 'Psicología',
      'dentistry': 'Odontología',
      'physiotherapy': 'Fisioterapia',
      'massage': 'Masaje',
      'acupuncture': 'Acupuntura',
      'beauty': 'Estética',
      'hair': 'Peluquería',
      'fitness': 'Fitness',
      'veterinary': 'Veterinaria',
      'consulting': 'Consultoría',
      'education': 'Educación',
      'yoga': 'Yoga',
      'barbershop': 'Barbería',
      'other': 'Otro'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <User className="h-5 w-5 text-pink-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">
            Expediente de {client.name}
          </h2>
        </div>
        <button
          onClick={() => {
            setSelectedRecord(null);
            setIsViewModalVisible(true);
          }}
          className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Registro
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="dermatology">Dermatología</option>
              <option value="nails">Uñas</option>
              <option value="beauty">Estética</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Timeline */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {searchTerm || filterType ? 'No se encontraron registros' : 'No hay registros para este cliente'}
          </p>
          {!searchTerm && !filterType && (
            <button
              onClick={() => setIsViewModalVisible(true)}
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              Crear el primer registro
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Historial de Registros ({filteredRecords.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredRecords.map((record, index) => (
              <div key={record.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(record.createdAt), 'dd MMM yyyy', { locale: es })}
                      </span>
                      <span className="ml-3 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                        {getRecordTypeLabel(record.category)}
                      </span>
                      {index === 0 && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Más reciente
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      {renderRecordContent(record)}
                    </div>
                    
                    {record.notes && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        <strong>Notas:</strong> {record.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsViewModalVisible(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Ver registro"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsViewModalVisible(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Editar registro"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Eliminar registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalVisible && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Registro del {format(new Date(selectedRecord.createdAt), 'dd MMM yyyy', { locale: es })}
              </h3>
              <button
                onClick={() => setIsViewModalVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedRecord.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                    {getRecordTypeLabel(selectedRecord.category)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Detalles</label>
                  <div className="mt-1">
                    {renderRecordContent(selectedRecord)}
                  </div>
                </div>
                
                {selectedRecord.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notas</label>
                    <p className="text-sm text-gray-900 whitespace-pre-line">
                      {selectedRecord.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsViewModalVisible(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientRecordsList;
