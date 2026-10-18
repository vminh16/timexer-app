import React, { useState, useEffect } from 'react'
import { PhoneFrame } from './components/PhoneFrame'
import { SetupScreen } from './components/SetupScreen'
import { ForecastScreen } from './components/ForecastScreen'
import { SuggestionScreen } from './components/SuggestionScreen'
import { DEFAULT_CONFIG, DEFAULT_APPLIANCES } from './services/mockData'
import { fetchForecast } from './services/api'
import type { Appliance, SystemConfig, ForecastAndDecisionResult } from './types'

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [appliances, setAppliances] = useState<Appliance[]>(DEFAULT_APPLIANCES)
  const [forecastResult, setForecastResult] = useState<ForecastAndDecisionResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedScenario, setSelectedScenario] = useState<string>('moderate')

  // Compute or refresh forecast when appliances, config or scenario changes
  const runForecastComputation = async (targetStep?: number, scenario?: string) => {
    setIsLoading(true)
    const activeScenario = scenario || selectedScenario
    try {
      const res = await fetchForecast(appliances, config, activeScenario)
      setForecastResult(res)
      if (targetStep) {
        setCurrentStep(targetStep)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    runForecastComputation(undefined, selectedScenario)
  }, [])

  const handleToggleAppliance = (id: string) => {
    setAppliances((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, isEnabled: !app.isEnabled } : app
      )
    )
  }

  const handleAddAppliance = (newApp: Appliance) => {
    setAppliances((prev) => [...prev, newApp])
  }

  const handleScenarioChange = (newScenario: string) => {
    setSelectedScenario(newScenario)
  }

  const handleStepChange = (step: number) => {
    if (step === 2 || step === 3) {
      if (!forecastResult) {
        runForecastComputation(step, selectedScenario)
        return
      }
    }
    setCurrentStep(step)
  }

  return (
    <PhoneFrame
      currentStep={currentStep}
      onStepChange={handleStepChange}
    >
      {currentStep === 1 && (
        <SetupScreen
          config={config}
          onUpdateConfig={setConfig}
          appliances={appliances}
          onToggleAppliance={handleToggleAppliance}
          onAddAppliance={handleAddAppliance}
          onNext={() => runForecastComputation(2, selectedScenario)}
          isLoading={isLoading}
          selectedScenario={selectedScenario}
          onSelectScenario={handleScenarioChange}
        />
      )}

      {currentStep === 2 && forecastResult && (
        <ForecastScreen
          result={forecastResult}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
          isLoading={isLoading}
          selectedScenario={selectedScenario}
          onSelectScenario={handleScenarioChange}
          onRePredict={(scenario) => runForecastComputation(undefined, scenario)}
        />
      )}

      {currentStep === 3 && forecastResult && (
        <SuggestionScreen
          result={forecastResult}
          onReset={() => setCurrentStep(1)}
          onBack={() => setCurrentStep(2)}
        />
      )}
    </PhoneFrame>
  )
}

export default App

