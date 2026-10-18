import React from 'react'
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  ArrowRight,
  TrendingDown,
  Calendar,
  Cpu,
  AlertTriangle,
  RotateCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { ForecastAndDecisionResult } from '../types'

interface ForecastScreenProps {
  result: ForecastAndDecisionResult
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
  selectedScenario: string
  onSelectScenario: (scenario: string) => void
  onRePredict: (scenario?: string) => void
}

export const ForecastScreen: React.FC<ForecastScreenProps> = ({
  result,
  onNext,
  onBack,
  isLoading = false,
  selectedScenario,
  onSelectScenario,
  onRePredict,
}) => {
  const {
    bestWindowStart,
    bestWindowEnd,
    totalSurplusKwh,
    hourlyPoints,
    isLiveModel,
    device,
    inferenceTimeMs,
    modelParameters,
    scenarioUsed,
    warningMessage,
  } = result

  // Render weather icon helper
  const renderWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'sun':
        return <Sun className="w-5 h-5 text-amber-500 fill-amber-400" />
      case 'sun-cloud':
        return <CloudSun className="w-5 h-5 text-amber-400" />
      case 'cloud':
        return <Cloud className="w-5 h-5 text-slate-400 fill-slate-300" />
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-400" />
      default:
        return <Sun className="w-5 h-5 text-amber-500" />
    }
  }

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isSurplus = data.netLoad < 0
      return (
        <div className="bg-slate-900/95 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700/80 backdrop-blur-md">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-3">
            <span>{data.label} Tomorrow</span>
            <span className="text-[10px] text-amber-400 font-semibold">
              {data.temperature}°C · {data.weatherIcon}
            </span>
          </p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-semibold ${
                  isSurplus ? 'text-sky-400' : 'text-blue-400'
                }`}
              >
                {isSurplus ? 'Solar Surplus' : 'Grid Purchase'}
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-400">Net Load:</span>
              <span className="font-mono font-bold">
                {Math.abs(data.netLoad).toFixed(2)} kWh
              </span>
            </p>
            {data.isInBestWindow && (
              <p className="text-[10px] text-amber-300 font-medium pt-1 border-t border-slate-800">
                ✨ Optimal solar window ({bestWindowStart}h–{bestWindowEnd}h)
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Title & Date */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tomorrow</h2>
        <span className="text-xs px-2.5 py-1 bg-sky-50 text-sky-700 font-semibold rounded-full border border-sky-200/60 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-sky-500" /> Day-Ahead (0h–24h)
        </span>
      </div>

      {/* Live AI Telemetry Badge (Tells user clearly whether real model or mock is running) */}
      <div
        className={`p-2.5 rounded-2xl border text-xs transition-all ${
          isLiveModel
            ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-950'
            : 'bg-amber-50/90 border-amber-200/80 text-amber-950'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isLiveModel ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <Cpu className="w-3.5 h-3.5" />
            <span>
              {isLiveModel
                ? `Live PyTorch (${device?.toUpperCase() || 'CUDA'})`
                : 'Local Simulation (Mock)'}
            </span>
          </div>
          <span className="text-[11px] font-mono font-medium opacity-80">
            {inferenceTimeMs ? `${inferenceTimeMs.toFixed(1)} ms` : '0 ms'}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] opacity-85">
          <span>
            {modelParameters
              ? `TimeXer (${(modelParameters / 1e6).toFixed(2)}M params)`
              : 'Rule-based Heuristic'}
          </span>
          <span className="truncate max-w-[170px] text-right font-medium">
            {scenarioUsed || selectedScenario}
          </span>
        </div>
      </div>

      {/* Interactive Prediction Toolbar (Scenario Switcher & Re-Predict Button) */}
      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200/80">
        <select
          value={selectedScenario}
          onChange={(e) => {
            const nextScenario = e.target.value
            onSelectScenario(nextScenario)
            onRePredict(nextScenario)
          }}
          disabled={isLoading}
          className="flex-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <option value="moderate">⛅ Moderate Solar (#7000)</option>
          <option value="sunny">☀️ High Solar Peak (#7200)</option>
          <option value="cloudy">🌧️ Low Solar / Rain (#6761)</option>
          <option value="live">🌐 Live Weather Forecast</option>
        </select>

        <button
          onClick={() => onRePredict(selectedScenario)}
          disabled={isLoading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
          title="Run TimeXer prediction now"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Running...' : 'Predict'}</span>
        </button>
      </div>

      {/* Guardrail Warning Banner (If surplus is too low to safely shift) */}
      {warningMessage && (
        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">AI Safety Guardrail Active</p>
            <p className="text-[11px] leading-tight text-amber-800 mt-0.5">
              {warningMessage}
            </p>
          </div>
        </div>
      )}

      {/* Surplus Big Card (Matching design_app.png exact layout) */}
      <div className="p-4 bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-sky-50/80 rounded-3xl border border-blue-200/70 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-28 h-28 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
          Surplus
        </p>
        <p className="text-3xl font-extrabold tracking-tight text-blue-600 mb-1">
          {bestWindowStart}h–{bestWindowEnd}h
        </p>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-700">
            ≈ {totalSurplusKwh.toFixed(1)} kWh
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              totalSurplusKwh >= 1.0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {totalSurplusKwh >= 1.0 ? 'Sufficient for shift' : 'Low Solar Margin'}
          </span>
        </div>
      </div>

      {/* Hourly Weather Preview Icons */}
      <div className="flex items-center justify-around py-1.5 px-3 bg-slate-50 rounded-2xl border border-slate-100/80 text-xs">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-slate-400">8h</span>
          {renderWeatherIcon('sun')}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-blue-600">{bestWindowStart}h</span>
          {renderWeatherIcon('sun')}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-blue-600">
            {Math.round((bestWindowStart + bestWindowEnd) / 2)}h
          </span>
          {renderWeatherIcon('sun')}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-slate-400">{bestWindowEnd}h</span>
          {renderWeatherIcon('sun-cloud')}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-slate-400">16h</span>
          {renderWeatherIcon('cloud')}
        </div>
      </div>

      {/* 24-Hour Net-Load Chart with Highlighted Best Window Region */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/90 shadow-xs relative">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-bold text-slate-700">Net-Load Profile (kWh/h)</span>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-blue-600">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs" /> buy
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2.5 h-2.5 bg-sky-300 rounded-xs" /> surplus
            </span>
          </div>
        </div>

        {/* Bi-directional Bar Chart */}
        <div className="h-40 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hourlyPoints}
              margin={{ top: 8, right: 6, left: -26, bottom: 0 }}
            >
              {/* Highlight Region for Best Window */}
              <ReferenceArea
                x1={`${bestWindowStart}h`}
                x2={`${Math.max(bestWindowStart, bestWindowEnd - 1)}h`}
                fill="#fef3c7"
                fillOpacity={0.65}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Zero Baseline */}
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />

              <XAxis
                dataKey="label"
                interval={5}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
              />
              <YAxis
                domain={[-2.5, 2.5]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={(val) => `${Math.abs(val)}`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Net-load bar */}
              <Bar dataKey="netLoad" radius={[2, 2, 2, 2]}>
                {hourlyPoints.map((entry, index) => {
                  const isSurplus = entry.netLoad < 0
                  const color = isSurplus ? '#7dd3fc' : '#2563eb'
                  return <Cell key={`cell-${index}`} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>


        </div>

        {/* Chart Explanatory Footer */}
        <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-sky-500" />
            Negative bars: Solar surplus
          </span>
          <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
            {bestWindowStart}h–{bestWindowEnd}h Window: {totalSurplusKwh.toFixed(1)} kWh
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-1 mt-auto flex items-center gap-2">
        <button
          onClick={onBack}
          className="py-3 px-4 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>View Suggestion & Schedule</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

