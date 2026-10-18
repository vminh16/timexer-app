import React, { useState } from 'react'
import {
  Wifi,
  Battery,
  Menu,
  X,
  Sliders,
  BarChart3,
  Lightbulb,
  Zap,
  Info,
} from 'lucide-react'

interface PhoneFrameProps {
  children: React.ReactNode
  currentStep: number // 1, 2, or 3
  onStepChange: (step: number) => void
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  currentStep,
  onStepChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleNavClick = (step: number) => {
    onStepChange(step)
    setIsMenuOpen(false)
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Setup'
      case 2:
        return 'Tomorrow'
      case 3:
        return 'Suggestion'
      default:
        return 'TimeXer'
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-900 select-none">
      {/* Smartphone Container - Authentic Mobile Shell */}
      <div className="relative w-full sm:w-[390px] h-screen sm:h-[844px] bg-white sm:rounded-[50px] shadow-[0_25px_70px_rgba(0,0,0,0.55),0_0_0_10px_#1e293b] overflow-hidden flex flex-col sm:border-[5px] sm:border-slate-800">
        
        {/* Dynamic Island / Speaker Notch (visible on desktop mockup) */}
        <div className="hidden sm:flex absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-50 items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
          <div className="w-8 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Top iOS/Android Status Bar (21:00) */}
        <div className="pt-2 sm:pt-3.5 px-6 pb-1 flex justify-between items-center text-xs font-bold text-slate-900 z-40 bg-white/95 backdrop-blur-xs shrink-0">
          <span className="font-semibold tracking-tight text-[13px]">21:00</span>
          <div className="flex items-center gap-1.5 opacity-85">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 fill-slate-900" />
          </div>
        </div>

        {/* In-App Navigation Bar with Hamburger Menu (☰) */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100 z-40 bg-white/95 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-800">
              {getStepTitle()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              TimeXer AI
            </span>
          </div>
        </div>

        {/* Main App Content Viewport */}
        <div className="flex-1 px-5 py-3 overflow-y-auto relative bg-white">
          {children}
        </div>

        {/* Bottom 3 Dots Navigation Bar (Matching slide figures/design_app.png) */}
        <div className="py-2.5 px-6 flex justify-center items-center gap-5 bg-white border-t border-slate-100 z-30 shrink-0">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => onStepChange(step)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentStep === step
                  ? 'w-2.5 h-2.5 bg-blue-600 scale-125 ring-3 ring-blue-100'
                  : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to step ${step}`}
            />
          ))}
        </div>

        {/* Home Indicator Bar */}
        <div className="w-full pb-2 pt-1 flex justify-center bg-white shrink-0">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* In-App Mobile Slide-out Drawer Menu (☰) */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Slide-out Menu Panel */}
            <div className="relative w-72 max-w-[80%] h-full bg-white shadow-2xl flex flex-col p-5 z-10 animate-in slide-in-from-left duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-sm">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-none">TimeXer NetLoad</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Solar Smart Shifting</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="py-4 space-y-1.5 flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  Navigation
                </p>

                <button
                  onClick={() => handleNavClick(1)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    currentStep === 1
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Sliders className={`w-4 h-4 ${currentStep === 1 ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>1. Setup & Appliances</span>
                </button>

                <button
                  onClick={() => handleNavClick(2)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    currentStep === 2
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 ${currentStep === 2 ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>2. Tomorrow Forecast</span>
                </button>

                <button
                  onClick={() => handleNavClick(3)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    currentStep === 3
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Lightbulb className={`w-4 h-4 ${currentStep === 3 ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>3. Suggestion & Schedule</span>
                </button>
              </div>

              {/* Drawer Footer Status */}
              <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center gap-2 text-slate-600">
                  <Info className="w-4 h-4 text-sky-500 shrink-0" />
                  <p className="text-[11px] leading-tight">
                    Inverter: <strong>Solarman · Connected</strong>
                  </p>
                </div>
                <p className="text-[10px] text-center text-slate-400">
                  TimeXer Exogenous TS Model v1.0
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
