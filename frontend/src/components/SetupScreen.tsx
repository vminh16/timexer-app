import React, { useState } from 'react'
import {
  Zap,
  Sun,
  MapPin,
  Moon,
  ArrowRight,
  Plus,
  WashingMachine,
  Bike,
  Flame,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import type { Appliance, SystemConfig } from '../types'

interface SetupScreenProps {
  config: SystemConfig
  onUpdateConfig: (config: SystemConfig) => void
  appliances: Appliance[]
  onToggleAppliance: (id: string) => void
  onAddAppliance: (appliance: Appliance) => void
  onNext: () => void
  isLoading?: boolean
  selectedScenario: string
  onSelectScenario: (scenario: string) => void
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  config,
  onUpdateConfig,
  appliances,
  onToggleAppliance,
  onAddAppliance,
  onNext,
  isLoading = false,
  selectedScenario,
  onSelectScenario,
}) => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [newAppPower, setNewAppPower] = useState('1.0')

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAppName.trim()) return
    const power = parseFloat(newAppPower) || 1.0
    const newApp: Appliance = {
      id: `custom-${Date.now()}`,
      name: newAppName.trim(),
      powerKwh: power,
      isEnabled: true,
      icon: 'custom',
      durationHours: 1,
      color: '#38bdf8',
    }
    onAddAppliance(newApp)
    setNewAppName('')
    setNewAppPower('1.0')
    setShowAddModal(false)
  }

  const getApplianceIcon = (icon: Appliance['icon']) => {
    switch (icon) {
      case 'washer':
        return <WashingMachine className="w-5 h-5 text-blue-600" />
      case 'scooter':
        return <Bike className="w-5 h-5 text-indigo-600" />
      case 'heater':
        return <Flame className="w-5 h-5 text-orange-500" />
      default:
        return <Zap className="w-5 h-5 text-sky-500" />
    }
  }

  const enabledCount = appliances.filter((a) => a.isEnabled).length

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Setup</h2>
        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-full border border-amber-200/60 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Day-Ahead (21:00)
        </span>
      </div>

      {/* System Parameter Cards (Matching slide design_app.png) */}
      <div className="space-y-2.5">
        {/* Inverter Card */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/70 flex items-center justify-center text-amber-600 shadow-xs">
              <Zap className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium leading-none mb-1">Inverter</p>
              <p className="text-sm font-semibold text-slate-800 leading-none">
                {config.inverterModel}{' '}
                <span className="text-xs font-normal text-slate-400">·</span>{' '}
                <span className="text-xs font-medium text-emerald-600">connected</span>
              </p>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>

        {/* Solar Panels Card */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/70 flex items-center justify-center text-amber-600 shadow-xs">
              <Sun className="w-5 h-5 text-amber-500 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium leading-none mb-1">Solar panels</p>
              <p className="text-sm font-semibold text-slate-800 leading-none">
                {config.panelCapacityKwp} kWp
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
            Roof Solar
          </span>
        </div>

        {/* Home Location Card */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/70 flex items-center justify-center text-blue-600 shadow-xs">
              <MapPin className="w-5 h-5 text-blue-600 fill-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium leading-none mb-1">Home location</p>
              <p className="text-sm font-semibold text-slate-800 leading-none">{config.location}</p>
            </div>
          </div>
          <select
            value={config.location}
            onChange={(e) => onUpdateConfig({ ...config, location: e.target.value })}
            className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Hanoi">Hanoi</option>
            <option value="Ho Chi Minh City">Ho Chi Minh City</option>
            <option value="Da Nang">Da Nang</option>
            <option value="Sydney">Sydney</option>
          </select>
        </div>

        {/* Prediction Scenario Card (Interactive AI & Guardrail testing) */}
        <div className="flex items-center justify-between p-3.5 bg-blue-50/70 hover:bg-blue-50 rounded-2xl border border-blue-200/70 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-indigo-600 font-semibold leading-none mb-1">
                AI Weather Scenario
              </p>
              <p className="text-xs font-medium text-slate-700 leading-none">
                {selectedScenario === 'sunny' && '☀️ High Solar Peak'}
                {selectedScenario === 'moderate' && '⛅ Moderate Solar'}
                {selectedScenario === 'cloudy' && '🌧️ Low Solar (Guardrail)'}
                {selectedScenario === 'live' && '🌐 Live Open-Meteo'}
              </p>
            </div>
          </div>
          <select
            value={selectedScenario}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="moderate">⛅ Moderate Solar (#7000)</option>
            <option value="sunny">☀️ High Solar Peak (#7200)</option>
            <option value="cloudy">🌧️ Low Solar / Dark (#6761)</option>
            <option value="live">🌐 Live Weather Forecast</option>
          </select>
        </div>
      </div>

      {/* Schedulable Appliances Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800">Schedulable appliances</h3>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {enabledCount} active
          </span>
        </div>

        {/* Informative Banner (Moon to Sun matching slide) */}
        <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-200/70 flex items-center gap-3 mb-3 text-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-amber-700 shrink-0">
            <Moon className="w-4 h-4 fill-amber-300 text-amber-600" />
            <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            <Sun className="w-4 h-4 fill-amber-500 text-amber-600" />
          </div>
          <p className="text-xs font-medium text-amber-900 leading-snug">
            Run in sunny hours to use spare solar power
          </p>
        </div>

        {/* Appliance List */}
        <div className="space-y-2.5">
          {appliances.map((app) => (
            <div
              key={app.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                app.isEnabled
                  ? 'bg-white border-slate-200/90 shadow-xs'
                  : 'bg-slate-50/60 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                  {getApplianceIcon(app.icon)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-none mb-1">
                    {app.name}
                  </p>
                  <p className="text-xs text-slate-500 leading-none">
                    about {app.powerKwh} kWh per run
                  </p>
                </div>
              </div>

              {/* iOS Style Toggle Switch */}
              <button
                type="button"
                onClick={() => onToggleAppliance(app.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  app.isEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={app.isEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    app.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}

          {/* Add custom appliance button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-blue-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors bg-slate-50/50 hover:bg-blue-50/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add custom appliance
          </button>
        </div>
      </div>

      {/* Add Custom Appliance Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-bold text-slate-900 mb-3">Add New Appliance</h4>
            <form onSubmit={handleAddNew} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Appliance Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dishwasher"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Energy Consumption (kWh/run)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={newAppPower}
                  onChange={(e) => setNewAppPower(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  Save Appliance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Primary Action Button (Proceed to Forecast) */}
      <div className="pt-2 mt-auto">
        <button
          onClick={onNext}
          disabled={isLoading || enabledCount === 0}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running TimeXer on CUDA...</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Run TimeXer AI Prediction</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
