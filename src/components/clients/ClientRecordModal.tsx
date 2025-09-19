import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Input, message, DatePicker, Select, Card, Space, Divider, TimePicker, Checkbox } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { ref as dbRef, push, set, onValue, off } from 'firebase/database';
import { database } from '../../config/firebase';
import type { Client, BusinessCategory, DigitalRecord, Service } from '../../types';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';

// Definir los tipos de registros permitidos basados en BusinessCategory
const recordTypes: BusinessCategory[] = [
  'dermatology',
  'nails',
  'nutrition',
  'psychology',
  'dentistry',
  'physiotherapy',
  'massage',
  'acupuncture',
  'beauty',
  'hair',
  'fitness',
  'veterinary',
  'consulting',
  'education'
];

interface ClientRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  client: Client | null;
  businessId: string;
  category: BusinessCategory;
  services?: Service[];
}

const ClientRecordModal: React.FC<ClientRecordModalProps> = ({
  visible,
  onClose,
  onSuccess = () => {}, // Valor por defecto para evitar el error
  client,
  businessId,
  category = 'physiotherapy' as BusinessCategory,
  services = []
}) => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  const [records, setRecords] = useState<DigitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  // Usar la categoría inicial o la primera de la lista
  const [activeTab, setActiveTab] = useState<BusinessCategory>(category);
  const [selectedRecord, setSelectedRecord] = useState<DigitalRecord | null>(null);

  useEffect(() => {
    if (!client?.id || !businessId) return;
    
    console.log('Iniciando carga de registros para cliente:', client.id);
    setLoading(true);
    
    const recordsRef = dbRef(database, `businesses/${businessId}/digitalRecords`);
    
    const handleRecordsUpdate = (snapshot: any) => {
      try {
        const recordsList: DigitalRecord[] = [];
        
        if (snapshot.exists()) {
          const recordsData = snapshot.val();
          
          Object.entries(recordsData).forEach(([id, record]: [string, any]) => {
            // Asegurarse de que el registro pertenece al cliente actual
            if (record.clientId === client.id) {
              // Asegurar que la categoría esté definida
              const recordCategory = record.category || 'general';
              
              recordsList.push({
                id,
                ...record,
                category: recordCategory,
                data: typeof record.data === 'object' ? record.data : {},
                // Asegurar que la fecha esté en formato correcto
                date: record.date || new Date().toISOString()
              });
            }
          });
          
          // Ordenar por fecha más reciente primero
          recordsList.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          console.log('Registros cargados:', recordsList);
          setRecords(recordsList);
        } else {
          console.log('No se encontraron registros en Firebase');
          setRecords([]);
        }
      } catch (error) {
        console.error('Error al procesar registros:', error);
        message.error('Error al cargar los registros');
      } finally {
        setLoading(false);
      }
    };
    
    // Suscribirse a cambios
    onValue(recordsRef, handleRecordsUpdate);
    
    // Limpiar suscripción al desmontar
    return () => {
      off(recordsRef, 'value', handleRecordsUpdate);
    };
  }, [client?.id, businessId]);

  useEffect(() => {
    if (selectedRecord) {
      form.setFieldsValue({
        ...selectedRecord.data,
        date: dayjs(selectedRecord.date),
        type: selectedRecord.category
      });
      setActiveTab(selectedRecord.category as BusinessCategory);
    } else {
      form.resetFields();
      // Usar el primer tipo de registro como valor por defecto
      setActiveTab(recordTypes[0]);
    }
  }, [selectedRecord, form]);

  const validateForm = (values: Record<string, any>) => {
    const errors: Record<string, string> = {};
    
    if (!values.date) {
      errors.date = 'La fecha es requerida';
    }
    
    if (activeTab === 'dermatology' || activeTab === 'physiotherapy') {
      if (!values.diagnosis) {
        errors.diagnosis = 'El diagnóstico es requerido';
      }
      if (!values.treatment) {
        errors.treatment = 'El tratamiento es requerido';
      }
    }
    
    if (values.scheduleAppointment) {
      if (!values.appointmentDate) {
        errors.appointmentDate = 'La fecha de la cita es requerida';
      }
      if (!values.appointmentTime) {
        errors.appointmentTime = 'La hora de la cita es requerida';
      }
      if (!values.serviceId) {
        errors.serviceId = 'Debe seleccionar un servicio para programar una cita';
      }
    }
    
    return errors;
  };

  const handleSubmit = async (values: Record<string, any>) => {
    if (!client || !businessId || !currentUser) return;
    
    // Validar el formulario
    const errors = validateForm(values);
    if (Object.keys(errors).length > 0) {
      // Mostrar errores en el formulario
      Object.entries(errors).forEach(([field, errorMsg]) => {
        form.setFields([{ name: field, errors: [errorMsg] }]);
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Crear una copia de values para no modificar el original
      const formValues = { ...values };
      const recordDate = formValues.date.format('YYYY-MM-DD');
      
      // Extraer campos de cita si es necesario
      const {
        scheduleAppointment,
        appointmentDate,
        appointmentTime,
        serviceId,
        appointmentNotes,
        ...recordDataValues
      } = formValues;
      
      // Eliminar campos que no deben ir en data
      delete recordDataValues.date;
      delete recordDataValues.type;
      
      // Crear el objeto de registro digital
      const recordData: Omit<DigitalRecord, 'id'> = {
        clientId: client.id,
        businessId,
        serviceId: '', // Campo requerido
        treatment: recordDataValues.treatment || '', // Campo requerido
        category: activeTab,
        date: recordDate,
        notes: recordDataValues.notes || '', // Campo requerido
        diagnosis: recordDataValues.diagnosis,
        duration: recordDataValues.duration ? parseInt(recordDataValues.duration) : undefined,
        data: recordDataValues,
        createdBy: currentUser.uid,
        createdAt: selectedRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Guardar en la base de datos
      let recordId: string | null = null;
      
      if (selectedRecord) {
        // Actualizar registro existente
        const recordRef = dbRef(database, `businesses/${businessId}/digitalRecords/${selectedRecord.id}`);
        await set(recordRef, recordData);
        recordId = selectedRecord.id;
        message.success('Expediente actualizado exitosamente');
      } else {
        // Crear nuevo registro
        const recordsRef = dbRef(database, `businesses/${businessId}/digitalRecords`);
        const newRecordRef = push(recordsRef);
        await set(newRecordRef, { ...recordData, id: newRecordRef.key });
        recordId = newRecordRef.key;
        message.success('Expediente guardado exitosamente');
      }
      
      // Programar cita si es necesario
      if (scheduleAppointment && appointmentDate && appointmentTime && serviceId) {
        try {
          const appointmentDateTime = dayjs(appointmentDate)
            .set('hour', appointmentTime.hour())
            .set('minute', appointmentTime.minute())
            .toISOString();
          
          const appointmentData = {
            clientId: client.id,
            serviceId,
            date: appointmentDateTime,
            status: 'scheduled',
            notes: `Tratamiento de ${activeTab}: ${values.treatment || 'Sin especificar'}. ${appointmentNotes || ''}`.trim(),
            businessId,
            createdBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            relatedRecordId: recordId
          };
          
          const appointmentsRef = dbRef(database, `businesses/${businessId}/appointments`);
          const newAppointmentRef = push(appointmentsRef);
          await set(newAppointmentRef, { ...appointmentData, id: newAppointmentRef.key });
          
          message.success('Cita programada exitosamente');
        } catch (appointmentError) {
          console.error('Error al programar la cita:', appointmentError);
          message.warning('El expediente se guardó, pero hubo un error al programar la cita');
        }
      }
      
      // Limpiar formulario y estado
      setSelectedRecord(null);
      form.resetFields();
      
      // Llamar a la función de éxito
      onSuccess();
    } catch (error) {
      console.error('Error al guardar el expediente:', error);
      message.error('Error al guardar el expediente. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      const recordRef = dbRef(database, `businesses/${businessId}/digitalRecords/${recordId}`);
      await set(recordRef, null);
      message.success('Registro eliminado exitosamente');
      
      // Actualizar la lista de registros
      setRecords(prev => prev.filter(r => r.id !== recordId));
      
      // Si el registro eliminado es el que está siendo editado, limpiar el formulario
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
        form.resetFields();
      }
    } catch (error) {
      console.error('Error al eliminar el registro:', error);
      message.error('Error al eliminar el registro');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    const commonFields = (
      <>
        <Form.Item 
          name="notes" 
          label="Notas"
          rules={[{ required: false, message: 'Este campo es requerido' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        
        <Divider orientation="left" style={{ margin: '16px 0' }}>Programar Próxima Cita</Divider>
        
        <Form.Item
          name="scheduleAppointment"
          valuePropName="checked"
          style={{ marginBottom: 16 }}
        >
          <Checkbox>Programar próxima cita</Checkbox>
        </Form.Item>
        
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.scheduleAppointment !== currentValues.scheduleAppointment
          }
        >
          {({ getFieldValue }) =>
            getFieldValue('scheduleAppointment') ? (
              <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <Form.Item
                  name="appointmentDate"
                  label="Fecha de la cita"
                  rules={[{ required: true, message: 'La fecha de la cita es requerida' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }} 
                    disabledDate={(current) => {
                      return current ? current < dayjs().startOf('day') : false;
                    }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="appointmentTime"
                  label="Hora de la cita"
                  rules={[{ required: true, message: 'La hora de la cita es requerida' }]}
                >
                  <TimePicker 
                    format="HH:mm" 
                    minuteStep={15}
                    style={{ width: '100%' }}
                    showNow={false}
                    showSecond={false}
                    hideDisabledOptions
                    disabledTime={() => ({
                      disabledHours: () => [],
                      disabledMinutes: () => [],
                    })}
                  />
                </Form.Item>
                
                <Form.Item
                  name="serviceId"
                  label="Servicio"
                  rules={[{ required: true, message: 'Debe seleccionar un servicio' }]}
                >
                  <Select
                    placeholder="Seleccionar servicio"
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) => {
                      const label = option?.label;
                      const inputString = String(input);
                      const labelString = String(label ?? '');
                      return labelString.toLowerCase().includes(inputString.toLowerCase());
                    }}
                  >
                    {services.map(service => (
                      <Select.Option key={service.id} value={service.id} label={service.name}>
                        {service.name} - {service.duration} min
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name="appointmentNotes"
                  label="Notas adicionales para la cita"
                >
                  <Input.TextArea rows={2} />
                </Form.Item>
              </div>
            ) : null
          }
        </Form.Item>
      </>
    );

    switch (activeTab) {
      case 'dermatology':
        return (
          <>
            <Form.Item 
              name="diagnosis" 
              label="Diagnóstico"
              rules={[{ required: true, message: 'El diagnóstico es requerido' }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item 
              name="treatment" 
              label="Tratamiento"
              rules={[{ required: true, message: 'El tratamiento es requerido' }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
            {commonFields}
          </>
        );
      case 'nails':
        return (
          <>
            <Form.Item 
              name="serviceType" 
              label="Tipo de Servicio"
              rules={[{ required: true, message: 'El tipo de servicio es requerido' }]}
            >
              <Input />
            </Form.Item>
            {commonFields}
          </>
        );
      default:
        return commonFields;
    }
  };

  const renderRecordList = () => {
    if (loading) {
      return <div className="p-4 text-center">Cargando registros...</div>;
    }
    
    // Filtrar registros por categoría activa
    const filteredRecords = records.filter(record => {
      // Asegurarse de que la categoría esté definida
      const recordCategory = record.category || 'general';
      return recordCategory === activeTab;
    });
    
    if (filteredRecords.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          No hay registros para mostrar en la categoría: <span className="font-medium capitalize">{activeTab}</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {filteredRecords.map(record => {
          const recordData = record.data || {};
          const recordDate = record.date ? dayjs(record.date) : dayjs();
          
          return (
            <Card 
              key={record.id}
              className="cursor-pointer hover:shadow-md transition-shadow mb-3"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">
                      {recordDate.format('DD/MM/YYYY')}
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {record.category || 'general'}
                    </span>
                  </div>
                  
                  {recordData.diagnosis && (
                    <p className="text-gray-800 text-sm">
                      <span className="font-medium">Diagnóstico:</span> {recordData.diagnosis}
                    </p>
                  )}
                  
                  {recordData.treatment && (
                    <p className="text-gray-700 text-sm">
                      <span className="font-medium">Tratamiento:</span> {recordData.treatment}
                    </p>
                  )}
                  
                  {recordData.note && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-gray-600 text-sm">
                        {recordData.note.length > 100 
                          ? `${recordData.note.substring(0, 100)}...` 
                          : recordData.note}
                      </p>
                    </div>
                  )}
                </div>
                
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined className="text-gray-400 hover:text-red-500" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (record.id) {
                      handleDeleteRecord(record.id);
                    }
                  }}
                  className="ml-2 -mt-1 -mr-2"
                />
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!client) return null;

  return (
    <Modal
      title={`Expediente de ${client.name || 'Cliente'}`}
      open={visible}
      onCancel={() => {
        setSelectedRecord(null);
        onClose();
      }}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Lista de registros */}
        <div style={{ width: '40%', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Registros</h3>
            <Button 
              type="primary" 
              onClick={() => setSelectedRecord(null)}
              disabled={!selectedRecord}
            >
              Nuevo Registro
            </Button>
          </div>
          
          {records.length > 0 ? (
            renderRecordList()
          ) : (
            <Card>
              <p>No hay registros para este cliente</p>
              <Button 
                type="primary" 
                onClick={() => setSelectedRecord(null)}
              >
                Crear primer registro
              </Button>
            </Card>
          )}
        </div>
        
        {/* Formulario de registro */}
        <div style={{ width: '60%', borderLeft: '1px solid #f0f0f0', paddingLeft: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            {selectedRecord ? 'Editar Registro' : 'Nuevo Registro'}
          </h3>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              date: dayjs(),
              type: activeTab,
              scheduleAppointment: false
            }}
          >
            <Form.Item 
              name="type"
              label="Tipo de Registro"
              rules={[{ required: true, message: 'El tipo de registro es requerido' }]}
            >
              <Select 
                onChange={(value: BusinessCategory) => setActiveTab(value)}
                placeholder="Seleccionar tipo de registro"
              >
                {recordTypes.map(type => (
                  <Select.Option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Divider />
            
            {renderFormFields()}
            
            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setSelectedRecord(null);
                  form.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {selectedRecord ? 'Actualizar' : 'Guardar'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default ClientRecordModal;