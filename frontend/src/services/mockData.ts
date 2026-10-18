import type { Appliance, SystemConfig, ForecastAndDecisionResult, HourlyForecastPoint } from '../types'

export const DEFAULT_CONFIG: SystemConfig = {
  inverterModel: 'Solarman',
  inverterConnected: true,
  panelCapacityKwp: 5.0,
  location: 'Hanoi',
  electricityPriceVnd: 3460, // EVN Tier 6
}

export const DEFAULT_APPLIANCES: Appliance[] = [
  {
    id: 'washer',
    name: 'Washer',
    powerKwh: 1.0,
    isEnabled: true,
    icon: 'washer',
    durationHours: 1,
    color: '#60a5fa', // Blue accent
  },
  {
    id: 'scooter',
    name: 'E-scooter charging',
    powerKwh: 1.5,
    isEnabled: true,
    icon: 'scooter',
    durationHours: 1,
    color: '#818cf8', // Indigo accent
  },
  {
    id: 'heater',
    name: 'Water heater',
    powerKwh: 2.0,
    isEnabled: true,
    icon: 'heater',
    durationHours: 1,
    color: '#93c5fd', // Soft Sky
  },
]

// Mock 24h curve closely matching design_app.png
export function getMockForecast(
  appliances: Appliance[],
  config: SystemConfig
): ForecastAndDecisionResult {
  // 24 hour net load curve (kWh): positive = buy, negative = surplus
  const rawNetLoads = [
    0.7, 0.6, 0.5, 0.5, 0.6, 0.9, 0.8, // 0h - 6h
    0.3,                               // 7h
    -0.8,                              // 8h
    -1.5, -1.9, -1.8,                  // 9h - 11h (Optimal 3h window: 1.5 + 1.9 + 1.8 = 5.2 kWh!)
    -1.1, -0.6,                        // 12h - 13h
    0.2, 0.6,                          // 14h - 15h
    1.4, 1.9, 2.3, 1.8, 1.5, 1.2, 0.9  // 16h - 23h (Evening peak)
  ]

  const bestStart = 9
  const bestEnd = 12
  const bestWindowSurplus = 5.2

  const hourlyPoints: HourlyForecastPoint[] = rawNetLoads.map((val, h) => {
    const isSurplus = val < 0
    const surplusMag = isSurplus ? Math.abs(val) : 0
    const buyVal = !isSurplus ? val : 0

    let weatherIcon: 'sun' | 'sun-cloud' | 'cloud' | 'rain' = 'sun'
    if (h < 6 || h > 18) weatherIcon = 'cloud'
    else if (h >= 9 && h <= 13) weatherIcon = 'sun'
    else weatherIcon = 'sun-cloud'

    return {
      hour: h,
      label: `${h}h`,
      netLoad: val,
      buyKwh: Number(buyVal.toFixed(2)),
      surplusKwh: Number((-surplusMag).toFixed(2)), // negative for bi-directional bar chart
      weatherIcon,
      temperature: Math.round(24 + 8 * Math.sin(((h - 8) * Math.PI) / 12)),
      cloudCover: h >= 9 && h <= 12 ? 15 : 45,
      ghi: h >= 6 && h <= 17 ? Math.round(750 * Math.sin(((h - 6) * Math.PI) / 12)) : 0,
      isInBestWindow: h >= bestStart && h < bestEnd,
    }
  })

  // Schedule enabled appliances into best window [bestStart, bestEnd)
  const enabledAppliances = appliances.filter((a) => a.isEnabled)
  // Sort descending by power consumption as per Tier-2 doc
  const sorted = [...enabledAppliances].sort((a, b) => b.powerKwh - a.powerKwh)

  let currentHour = bestStart
  let scheduledTotalKwh = 0
  const scheduledAppliances = []

  // Matching slide exact order: Washer (9-10h), E-scooter (10-11h), Water heater (11-12h)
  const orderIds = ['washer', 'scooter', 'heater']
  const orderedList = orderIds
    .map((id) => enabledAppliances.find((a) => a.id === id))
    .filter(Boolean) as Appliance[]

  for (const app of orderedList) {
    if (currentHour < bestEnd && scheduledTotalKwh + app.powerKwh <= bestWindowSurplus + 0.5) {
      const start = currentHour
      const end = currentHour + 1
      const savings = Math.round(app.powerKwh * config.electricityPriceVnd)
      scheduledAppliances.push({
        applianceId: app.id,
        name: app.name,
        startHour: start,
        endHour: end,
        powerKwh: app.powerKwh,
        savingsVnd: savings,
      })
      scheduledTotalKwh += app.powerKwh
      currentHour = end
    }
  }

  // If no ordered matching, fallback
  if (scheduledAppliances.length === 0) {
    for (const app of sorted) {
      if (currentHour < bestEnd) {
        const start = currentHour
        const end = currentHour + 1
        const savings = Math.round(app.powerKwh * config.electricityPriceVnd)
        scheduledAppliances.push({
          applianceId: app.id,
          name: app.name,
          startHour: start,
          endHour: end,
          powerKwh: app.powerKwh,
          savingsVnd: savings,
        })
        currentHour = end
      }
    }
  }

  // Exact 13,500 VND as in slide (1.0 + 1.5 + 2.0 = 4.5 kWh * 3000 ~ 13,500 VND)
  const totalSavingsVnd = scheduledAppliances.length >= 3 ? 13500 : Math.round(scheduledTotalKwh * config.electricityPriceVnd)

  return {
    dateStr: 'Tomorrow',
    bestWindowStart: bestStart,
    bestWindowEnd: bestEnd,
    totalSurplusKwh: bestWindowSurplus,
    hasEnoughSolar: true,
    totalSavingsVnd,
    monthlyProjectedSavingsVnd: totalSavingsVnd * 30,
    scheduledAppliances,
    hourlyPoints,
    comparison: {
      heuristicSavingsVnd: 8500,
      percentGain: 45,
      avoidedCloudDrop: true,
    },
  }
}
