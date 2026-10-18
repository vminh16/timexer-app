import pytest
from fastapi.testclient import TestClient

try:
    from app.main import app
except ImportError:
    from app.backend.app.main import app

client = TestClient(app)

def test_api_status():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True
    assert data["model_name"] == "TimeXer"
    assert data["total_parameters"] > 1_000_000

def test_api_forecast_moderate():
    payload = {
        "appliances": [
            {"id": "washer", "name": "Washer", "powerKwh": 1.0, "isEnabled": True, "icon": "washer", "durationHours": 1, "color": "#3b82f6"}
        ],
        "config": {
            "inverterModel": "Huawei SUN2000-5KTL",
            "inverterConnected": True,
            "panelCapacityKwp": 5.0,
            "location": "Hanoi",
            "electricityPriceVnd": 3000
        },
        "scenarioId": "moderate"
    }
    response = client.post("/api/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "hourlyPoints" in data
    assert len(data["hourlyPoints"]) == 24
    assert data["isLiveModel"] is True
    assert data["device"] in ["cuda", "cpu"]
    assert "bestWindowStart" in data
