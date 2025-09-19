import type { BusinessCategory, BusinessCategoryInfo } from '../types';

export const BUSINESS_CATEGORIES: Record<BusinessCategory, BusinessCategoryInfo> = {
  dermatology: {
    id: 'dermatology',
    name: 'Dermatología',
    description: 'Consultas dermatológicas, tratamientos de piel y procedimientos estéticos',
    icon: '🩺',
    defaultServices: [
      'Consulta dermatológica',
      'Tratamiento de acné',
      'Limpieza facial',
      'Peeling químico',
      'Botox',
      'Rellenos faciales'
    ]
  },
  nails: {
    id: 'nails',
    name: 'Uñas',
    description: 'Manicure, pedicure y arte en uñas',
    icon: '💅',
    defaultServices: [
      'Manicure básico',
      'Manicure con gel',
      'Pedicure',
      'Uñas acrílicas',
      'Arte en uñas',
      'Esmaltado permanente'
    ]
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutrición',
    description: 'Consultas nutricionales y planes alimentarios',
    icon: '🥗',
    defaultServices: [
      'Consulta nutricional',
      'Plan alimentario',
      'Seguimiento nutricional',
      'Análisis corporal',
      'Educación nutricional'
    ]
  },
  psychology: {
    id: 'psychology',
    name: 'Psicología',
    description: 'Terapia psicológica y consultas de salud mental',
    icon: '🧠',
    defaultServices: [
      'Terapia individual',
      'Terapia de pareja',
      'Terapia familiar',
      'Evaluación psicológica',
      'Terapia cognitivo-conductual'
    ]
  },
  dentistry: {
    id: 'dentistry',
    name: 'Odontología',
    description: 'Servicios dentales y de salud bucal',
    icon: '🦷',
    defaultServices: [
      'Consulta dental',
      'Limpieza dental',
      'Empastes',
      'Endodoncia',
      'Ortodoncia',
      'Blanqueamiento'
    ]
  },
  physiotherapy: {
    id: 'physiotherapy',
    name: 'Fisioterapia',
    description: 'Rehabilitación física y terapias de movimiento',
    icon: '🏃‍♂️',
    defaultServices: [
      'Evaluación fisioterapéutica',
      'Terapia manual',
      'Ejercicios terapéuticos',
      'Electroterapia',
      'Rehabilitación deportiva'
    ]
  },
  massage: {
    id: 'massage',
    name: 'Masajes',
    description: 'Masajes terapéuticos y relajantes',
    icon: '💆‍♀️',
    defaultServices: [
      'Masaje relajante',
      'Masaje terapéutico',
      'Masaje deportivo',
      'Masaje con piedras calientes',
      'Reflexología'
    ]
  },
  acupuncture: {
    id: 'acupuncture',
    name: 'Acupuntura',
    description: 'Tratamientos de medicina tradicional china',
    icon: '🪡',
    defaultServices: [
      'Sesión de acupuntura',
      'Electroacupuntura',
      'Moxibustión',
      'Ventosas',
      'Auriculoterapia'
    ]
  },
  beauty: {
    id: 'beauty',
    name: 'Estética',
    description: 'Tratamientos de belleza y cuidado facial',
    icon: '✨',
    defaultServices: [
      'Limpieza facial',
      'Hidratación facial',
      'Tratamiento anti-edad',
      'Depilación',
      'Microdermoabrasión'
    ]
  },
  hair: {
    id: 'hair',
    name: 'Peluquería',
    description: 'Cortes, peinados y tratamientos capilares',
    icon: '💇‍♀️',
    defaultServices: [
      'Corte de cabello',
      'Peinado',
      'Coloración',
      'Tratamiento capilar',
      'Alisado',
      'Permanente'
    ]
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness',
    description: 'Entrenamiento personal y clases de ejercicio',
    icon: '💪',
    defaultServices: [
      'Entrenamiento personal',
      'Clase grupal',
      'Evaluación física',
      'Plan de entrenamiento',
      'Yoga',
      'Pilates'
    ]
  },
  veterinary: {
    id: 'veterinary',
    name: 'Veterinaria',
    description: 'Atención médica para mascotas',
    icon: '🐕',
    defaultServices: [
      'Consulta veterinaria',
      'Vacunación',
      'Desparasitación',
      'Cirugía menor',
      'Análisis clínicos',
      'Grooming'
    ]
  },
  consulting: {
    id: 'consulting',
    name: 'Consultoría',
    description: 'Servicios de consultoría profesional',
    icon: '💼',
    defaultServices: [
      'Consulta inicial',
      'Análisis de negocio',
      'Plan estratégico',
      'Seguimiento',
      'Capacitación'
    ]
  },
  education: {
    id: 'education',
    name: 'Educación',
    description: 'Clases particulares y tutorías',
    icon: '📚',
    defaultServices: [
      'Clase particular',
      'Tutoría grupal',
      'Preparación de exámenes',
      'Apoyo escolar',
      'Idiomas'
    ]
  },
  yoga: {
    id: 'yoga',
    name: 'Yoga',
    description: 'Clases de yoga y meditación',
    icon: '🧘‍♀️',
    defaultServices: [
      'Clase de Hatha Yoga',
      'Clase de Vinyasa',
      'Yoga restaurativo',
      'Meditación',
      'Yoga prenatal'
    ]
  },
  barbershop: {
    id: 'barbershop',
    name: 'Barbería',
    description: 'Cortes y arreglos para hombres',
    icon: '💈',
    defaultServices: [
      'Corte de cabello',
      'Afeitado',
      'Arreglo de barba',
      'Lavado de cabello',
      'Tratamiento capilar'
    ]
  },
  other: {
    id: 'other',
    name: 'Otro',
    description: 'Otros servicios profesionales',
    icon: '⚙️',
    defaultServices: [
      'Consulta',
      'Servicio básico',
      'Servicio premium',
      'Seguimiento'
    ]
  }
};

export const getCategoryInfo = (category: BusinessCategory): BusinessCategoryInfo => {
  return BUSINESS_CATEGORIES[category];
};

export const getAllCategories = (): BusinessCategoryInfo[] => {
  return Object.values(BUSINESS_CATEGORIES);
};
