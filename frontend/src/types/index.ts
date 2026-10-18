export type ApplianceIcon = 'washer' | 'scooter' | 'heater' | 'custom'

export interface Appliance {
  id: string
  name: string
  powerKwh: number
  isEnabled: boolean
  icon: ApplianceIcon
  durationHours: number
  color: string
}

export interface SystemConfig {
  inverterModel: string
  inverterConnected: boolean
  panelCapacityKwp: number
  location: string
  electricityPriceVnd: number
}

export interface HourlyForecastPoint {
  hour: number
  label: string
  netLoad: number // Raw net load (positive = buy, negative = surplus)
  buyKwh: number // For chart positive bar
  surplusKwh: number // Positive value for chart negative bar (magnitude)
  weatherIcon: 'sun' | 'sun-cloud' | 'cloud' | 'rain'
  temperature: number
  cloudCover: number
  ghi: number
  isInBestWindow: boolean
}

export interface ScheduledAppliance {
  applianceId: string
  name: string
  startHour: number
  endHour: number
  powerKwh: number
  savingsVnd: number
}

export interface ForecastAndDecisionResult {
  dateStr: string
  bestWindowStart: number
  bestWindowEnd: number
  totalSurplusKwh: number
  hasEnoughSolar: boolean
  warningMessage?: string
  totalSavingsVnd: number
  monthlyProjectedSavingsVnd: number
  scheduledAppliances: ScheduledAppliance[]
  hourlyPoints: HourlyForecastPoint[]
  comparison: {
    heuristicSavingsVnd: number
    percentGain: number
    avoidedCloudDrop: boolean
  }
  isLiveModel?: boolean
  device?: string
  inferenceTimeMs?: number
  modelParameters?: number
  scenarioUsed?: string
}
