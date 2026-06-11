export const DOC_CATEGORIES = ['Plans & Drawings', 'Contracts', 'Permits', 'Reports', 'Specifications', 'Other'] as const
export type DocCategory = typeof DOC_CATEGORIES[number]

export interface ProjectDocument {
  id: string
  companyId: string
  projectId: string
  name: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: DocCategory
  uploadedById: string
  uploadedByName: string
  createdAt: string
}

export interface CreateDocumentData {
  name: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: DocCategory
}

export interface UploadResult {
  url: string
  fileType: string
  fileSize: number
  name: string
}
