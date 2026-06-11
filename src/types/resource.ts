export type EquipmentStatus = 'Available' | 'In Use' | 'Maintenance'

export const EQUIPMENT_CATEGORIES = [
  'Heavy Machinery',
  'Tools',
  'Scaffolding',
  'Safety Equipment',
  'Electrical',
  'Plumbing',
  'Other',
] as const

export const MATERIAL_UNITS = [
  'm³', 'tonnes', 'bags', 'sheets', 'units', 'm', 'm²', 'litres', 'kg',
] as const

export interface Equipment {
  id: string
  companyId: string
  name: string
  category: string
  status: EquipmentStatus
  projectId: string | null
  projectName: string | null
  notes: string | null
  createdAt: string
}

export interface Material {
  id: string
  companyId: string
  projectId: string | null
  projectName: string | null
  name: string
  unit: string
  quantity: number
  createdAt: string
}

export interface Vehicle {
  id: string
  companyId: string
  name: string
  plateNumber: string
  driverName: string | null
  projectId: string | null
  projectName: string | null
  createdAt: string
}

export interface CreateEquipmentData {
  name: string
  category: string
  status: EquipmentStatus
  projectId: string | null
  notes: string | null
}

export interface CreateMaterialData {
  name: string
  unit: string
  quantity: number
  projectId: string | null
}

export interface CreateVehicleData {
  name: string
  plateNumber: string
  driverName: string | null
  projectId: string | null
}
