# ⚡ TimeXer AI - Day-Ahead Solar Net-Load Forecasting & Smart Load Shifting

An intelligent, full-stack mobile web application powered by Google DeepMind's **TimeXer** architecture. It forecasts tomorrow's 24-hour household solar net-load profile at 21:00 Day-Ahead and dynamically schedules heavy appliances (washer, e-scooter, water heater) into optimal solar surplus windows, preventing EVN peak electricity penalties.

---

## 📱 Key Features

1. **Authentic Mobile Experience**:
   - iPhone-inspired chassis with dynamic status bar (21:00 Day-Ahead reminder), in-app hamburger drawer (`☰`), and 3-dot step indicators.
   - 100% unified English interface matching production specifications.
2. **Interactive TimeXer Prediction**:
   - Run live PyTorch inferences directly from the UI on Screen 1 (Setup) or Screen 2 (Forecast).
   - Real-time AI Telemetry badge clearly indicating:
     - `🟢 Live PyTorch (CUDA)` vs `🟡 Local Simulation (Mock)`
     - Model parameter count (`1.71M params`)
     - Inference latency in milliseconds (`~16ms - 30ms`)
3. **Multi-Scenario AI Testing & Guardrails**:
   - **☀️ High Solar Peak (#7200)**: Large solar generation (3.2+ kWh surplus), scheduling washer, e-scooter, and water heater to save up to 15,000+ VND/day.
   - **⛅ Moderate Solar (#7000)**: Balanced rooftop generation (2.5 kWh surplus).
   - **🌧️ Low Solar / Rainy (#6761 Guardrail Trigger)**: Minimal solar surplus (0.68 kWh < 1.0 kWh threshold). Triggers AI safety guardrail to pause shifting and protect user from drawing 3,460 VND/kWh peak grid electricity.
   - **🌐 Live Hanoi Weather**: Real-time integration with Open-Meteo GHI and cloud cover forecast.

---

## 🏗️ Project Architecture

```
timexer-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI endpoints (/api/forecast, /api/status)
│   │   ├── config.py            # Model parameters & paths
│   │   ├── schemas.py           # Pydantic v2 schemas
│   │   ├── engine/
│   │   │   ├── model_runner.py  # PyTorch TimeXer inference pipeline on CUDA
│   │   │   ├── decision.py      # Tier-2 5-step load shifting optimization
│   │   │   └── weather.py       # Open-Meteo weather API client
│   │   └── tests/               # Pytest suite (decision engine & API)
│   ├── ai/                      # TimeXer model layers & utils
│   ├── checkpoints/             # Trained PyTorch checkpoint (checkpoint.pth)
│   ├── data/                    # Solar_Customer_1.csv dataset
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # PhoneFrame, SetupScreen, ForecastScreen, SuggestionScreen
│   │   ├── services/            # API client with automatic fallback
│   │   └── types/               # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── run.sh                       # One-click launcher script
└── README.md
```

---

## 🚀 Quick Start

### Option 1: Native Runner (Recommended)

Run both backend and frontend simultaneously with the provided script:
```bash
./run.sh
```

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

### Option 2: Run Separately

**Backend**:
```bash
cd backend
PYTHONPATH=. python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

### Option 3: Docker Compose

```bash
docker compose up --build
```

---

## 🧪 Running Automated Tests

```bash
cd backend
pytest app/tests/
```
All tests verify PyTorch checkpoint inference on CUDA and load-shifting logic.
