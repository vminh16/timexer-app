import type { Appliance, SystemConfig, ForecastAndDecisionResult } from '../types'
import { getMockForecast } from './mockData'

export async function fetchForecast(
  appliances: Appliance[],
  config: SystemConfig,
  scenarioId: string = "moderate"
): Promise<ForecastAndDecisionResult> {
  try {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appliances,
        config,
        scenarioId,
      }),
      signal: AbortSignal.timeout(4000), // 4s timeout
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: ForecastAndDecisionResult = await response.json()
    return data
  } catch (error) {
    // Graceful fallback to mock data (ideal for standalone frontend demo or when training)
    console.info('Backend API unavailable or training, using high-fidelity local simulation:', error)
    return getMockForecast(appliances, config)
  }
}

export async function checkBackendStatus(): Promise<{ ready: boolean; model_status: string }> {
  try {
    const res = await fetch('/api/status', { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Ignore network error
  }
  return { ready: false, model_status: 'training_slot_ready' }
}
