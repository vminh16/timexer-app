import React, { useState } from 'react'
import {
  Bell,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { ForecastAndDecisionResult } from '../types'

interface SuggestionScreenProps {
  result: ForecastAndDecisionResult
  onReset: () => void
  onBack: () => void
}

export const SuggestionScreen: React.FC<SuggestionScreenProps> = ({
  result,
  onReset,
  onBack,
}) => {
  const [remindersSet, setRemindersSet] = useState(false)
  const [showNotificationToast, setShowNotificationToast] = useState(false)

  const {
    totalSavingsVnd,
    monthlyProjectedSavingsVnd,
    comparison,
  } = result

  const handleSetReminders = () => {
    setRemindersSet(true)
    setShowNotificationToast(true)
    setTimeout(() => {
      setShowNotificationToast(false)
    }, 4500)
  }

  return (
    <div className="flex flex-col h-full space-y-3.5 relative">
      {/* Toast Notification */}
      {showNotificationToast && (
        <div className="absolute top-0 left-0 right-0 z-50 p-3 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Reminders Scheduled!</p>
            <p className="text-[11px] text-emerald-100 font-normal">
              Alerts set for 9:00 AM, 10:00 AM, and 11:00 AM tomorrow.
            </p>
          </div>
        </div>
      )}

      {/* Screen Title */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Suggestion</h2>
        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded-full border border-amber-200/70 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Smart Shift
        </span>
      </div>

      {/* Big Savings Card (Cream/Yellow card with squiggly underline matching slide) */}
      <div className="p-4 bg-gradient-to-br from-amber-100/70 via-amber-50/90 to-yellow-100/60 rounded-3xl border border-amber-200/90 shadow-xs relative overflow-hidden">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-0.5">
          Savings
        </p>
        <div className="relative inline-block">
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-800 mb-1">
            {totalSavingsVnd.toLocaleString('en-US')} VND
          </p>
          {/* Decorative squiggly line from slide */}
          <svg
            className="absolute -bottom-1.5 left-0 w-full h-2 text-red-500/90 overflow-visible"
            viewBox="0 0 100 6"
            fill="none"
          >
            <path
              d="M0 3 Q 6 0, 12 3 T 24 3 T 36 3 T 48 3 T 60 3 T 72 3 T 84 3 T 96 3 T 108 3"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs text-amber-900/80 font-medium">
          <span>Monthly Projection:</span>
          <span className="font-bold text-amber-900">
            ~{monthlyProjectedSavingsVnd.toLocaleString('en-US')} VND/mo
          </span>
        </div>
      </div>

      {/* Gantt Timeline Schedule */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs flex-1 flex flex-col justify-between">
        <div>
          {/* Hours Header Grid */}
          <div className="grid grid-cols-4 pb-2 border-b border-slate-100 text-center text-xs font-bold text-slate-500">
            <span>{result.bestWindowStart}h</span>
            <span>{result.bestWindowStart + 1}h</span>
            <span>{result.bestWindowStart + 2}h</span>
            <span>{result.bestWindowEnd}h</span>
          </div>

          {/* If guardrail triggered / no surplus to shift */}
          {(!result.hasEnoughSolar || result.scheduledAppliances.length === 0) ? (
            <div className="py-8 px-4 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No Shift Recommended Tomorrow</p>
              <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                Tomorrow is forecasted with low solar generation. Running heavy appliances in normal schedule prevents buying peak grid electricity.
              </p>
            </div>
          ) : (
            /* Timeline Grid Rows */
            <div className="relative mt-3 space-y-4">
              {/* Background vertical dotted grid lines */}
              <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                <div className="border-r border-dashed border-slate-100" />
                <div className="border-r border-dashed border-slate-100" />
                <div className="border-r border-dashed border-slate-100" />
                <div className="" />
              </div>

              {result.scheduledAppliances.map((app, idx) => {
                const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-sky-400', 'bg-emerald-500']
                const color = colors[idx % colors.length]
                const colStart = Math.min(Math.max(app.startHour - result.bestWindowStart, 0), 2)
                return (
                  <div key={app.applianceId} className="relative z-10 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{app.name}</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">
                        +{app.savingsVnd.toLocaleString()} VND
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-7">
                      {Array.from({ length: colStart }).map((_, i) => (
                        <div key={i} className="col-span-1" />
                      ))}
                      <div
                        className={`col-span-1 ${color} rounded-xl flex items-center justify-center text-[10px] text-white font-bold shadow-xs transition-colors`}
                      >
                        {app.startHour}h - {app.endHour}h
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Benefits Comparison note vs fixed 11h-14h */}
        <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[11px] leading-tight text-slate-700">
            {comparison.avoidedCloudDrop ? (
              <span>
                Smart Shift avoids afternoon cloud drop, outperforming naive midday heuristics by <strong>+{comparison.percentGain}%</strong>.
              </span>
            ) : (
              <span>
                Saves <strong>+{comparison.percentGain}%</strong> more than fixed 11h–14h heuristic; dynamically synchronized to solar peak.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Action Button: Set Reminders (Matching slide button) */}
      <div className="pt-1 mt-auto space-y-2">
        <button
          onClick={handleSetReminders}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
            remindersSet
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-blue-500/20'
          }`}
        >
          {remindersSet ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Reminders Active (9h–12h)</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 fill-white" />
              <span>Set reminders</span>
            </>
          )}
        </button>

        {/* Reset / Adjust Settings Button */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1 cursor-pointer"
          >
            ← Back to Forecast
          </button>
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold py-1 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Adjust Setup
          </button>
        </div>
      </div>
    </div>
  )
}
