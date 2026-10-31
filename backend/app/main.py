from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import CHECKPOINT_PATH
from .schemas import (
    ForecastRequest,
    ForecastResponse,
    HourlyPointSchema,
    StatusResponse,
    ReminderRequest,
    ReminderResponse,
)
from .engine.model_runner import runner
from .engine.decision import run_decision_engine
from .engine.weather import fetch_open_meteo_weather

app = FastAPI(
    title="TimeXer Net-Load Forecasting API",
    description="Day-ahead solar net-load forecasting and intelligent load shifting powered by TimeXer AI",
    version="1.0.0",
)

# Enable CORS for local dev and docker containers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    import os
    return {
        "status": "ok",
        "service": "timexer-backend",
        "commit": os.environ.get("RENDER_GIT_COMMIT", "local"),  # Render sets this at runtime
    }


@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    return StatusResponse(
        ready=runner.is_loaded,
        model_name="TimeXer",
        checkpoint_loaded=runner.is_loaded,
        checkpoint_path=CHECKPOINT_PATH,
        device=str(runner.device),
        total_parameters=runner.total_parameters,
    )


@app.post("/api/forecast", response_model=ForecastResponse)
async def compute_forecast(req: ForecastRequest):
    try:
        # 1. Scale factor based on user's panel capacity (default: 5.0 kWp = 1.0)
        panel_factor = max(0.2, req.config.panelCapacityKwp / 5.0)
        scenario_id = req.scenarioId or "moderate"

        # 2. Run TimeXer PyTorch checkpoint prediction
        pred_24h, inference_ms, scenario_label = runner.predict(
            panel_factor=panel_factor, scenario_id=scenario_id
        )

        # 3. Fetch hourly weather forecast
        weather_list = await fetch_open_meteo_weather(req.config.location)

        # 4. Run Tier-2 Decision Engine
        (
            best_start,
            best_end,
            total_surplus_kwh,
            has_enough_solar,
            warning_message,
            total_savings_vnd,
            monthly_projected_vnd,
            scheduled,
            comparison,
        ) = run_decision_engine(
            net_load_24h=pred_24h,
            appliances=req.appliances,
            price_vnd=req.config.electricityPriceVnd,
        )

        # 5. Format hourly forecast points
        hourly_points = []
        for h in range(24):
            val = float(pred_24h[h])
            buy_val = max(0.0, val)
            surplus_val = max(0.0, -val)
            w_point = weather_list[h] if h < len(weather_list) else {}

            hourly_points.append(
                HourlyPointSchema(
                    hour=h,
                    label=f"{h}h",
                    netLoad=round(val, 2),
                    buyKwh=round(buy_val, 2),
                    surplusKwh=round(-surplus_val, 2),  # negative magnitude for bi-directional chart
                    weatherIcon=w_point.get("weatherIcon", "sun"),
                    temperature=w_point.get("temperature", 28),
                    cloudCover=w_point.get("cloudCover", 20),
                    ghi=w_point.get("ghi", 400),
                    isInBestWindow=(best_start <= h < best_end),
                )
            )

        return ForecastResponse(
            dateStr="Tomorrow",
            bestWindowStart=best_start,
            bestWindowEnd=best_end,
            totalSurplusKwh=total_surplus_kwh,
            hasEnoughSolar=has_enough_solar,
            warningMessage=warning_message,
            totalSavingsVnd=total_savings_vnd,
            monthlyProjectedSavingsVnd=monthly_projected_vnd,
            scheduledAppliances=scheduled,
            hourlyPoints=hourly_points,
            comparison=comparison,
            isLiveModel=runner.is_loaded,
            device=str(runner.device),
            inferenceTimeMs=inference_ms,
            modelParameters=runner.total_parameters,
            scenarioUsed=scenario_label,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/api/reminders", response_model=ReminderResponse)
async def set_reminders(req: ReminderRequest):
    count = len(req.applianceIds)
    return ReminderResponse(
        success=True,
        scheduledCount=count,
        message=f"Successfully scheduled {count} reminders into optimal solar hours tomorrow.",
    )


# Mount built static frontend if present (for Hugging Face Spaces or unified production serving)
import os
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend",
        "dist",
    ),
)

if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

