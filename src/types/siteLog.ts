export type SiteLogWeather = 'Sunny' | 'Partly Cloudy' | 'Cloudy' | 'Rainy' | 'Stormy' | 'Windy'

export const WEATHER_OPTIONS: SiteLogWeather[] = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy', 'Windy']

export interface SiteLog {
  id: string
  companyId: string
  projectId: string
  logDate: string
  weather: SiteLogWeather | null
  temperatureC: number | null
  crewCount: number | null
  workCompleted: string
  materialsDelivered: string | null
  issues: string | null
  safetyNotes: string | null
  createdById: string
  createdByName: string
  createdAt: string
}

export interface CreateSiteLogData {
  logDate: string
  weather?: SiteLogWeather
  temperatureC?: number
  crewCount?: number
  workCompleted: string
  materialsDelivered?: string
  issues?: string
  safetyNotes?: string
}
