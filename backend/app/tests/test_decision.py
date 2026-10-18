import pytest
import numpy as np

try:
    from app.engine.decision import run_decision_engine
    from app.schemas import ApplianceSchema
except ImportError:
    from app.backend.app.engine.decision import run_decision_engine
    from app.backend.app.schemas import ApplianceSchema

def test_decision_engine_sunny_day():
    # Net load with peak surplus at 9h-11h
    net_load = np.array([
        0.5, 0.5, 0.4, 0.4, 0.5, 0.8, 0.6, 0.2,
        -1.0, -1.8, -2.0, -1.5, -0.8, -0.4,
        0.2, 0.5, 1.2, 1.8, 2.0, 1.6, 1.2, 0.9, 0.7, 0.6
    ], dtype=np.float32)

    appliances = [
        ApplianceSchema(id="washer", name="Washer", powerKwh=1.0, isEnabled=True),
        ApplianceSchema(id="heater", name="Water heater", powerKwh=2.0, isEnabled=True),
        ApplianceSchema(id="scooter", name="E-scooter", powerKwh=1.5, isEnabled=True),
    ]

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
    ) = run_decision_engine(net_load, appliances, price_vnd=3460.0)

    assert has_enough_solar is True
    assert warning_message is None
    assert best_start in [8, 9, 10]
    assert best_end == best_start + 3
    assert total_surplus_kwh >= 4.0
    assert total_savings_vnd > 0
    assert len(scheduled) == 3

    # Verify descending energy order: Water heater (2.0) first, then E-scooter (1.5), then Washer (1.0)
    assert scheduled[0].name == "Water heater"
    assert scheduled[1].name == "E-scooter"
    assert scheduled[2].name == "Washer"

def test_decision_engine_dark_cloudy_day():
    # Fully cloudy day: house always buys from grid, zero surplus
    net_load = np.ones(24, dtype=np.float32) * 1.5

    appliances = [
        ApplianceSchema(id="washer", name="Washer", powerKwh=1.0, isEnabled=True),
    ]

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
    ) = run_decision_engine(net_load, appliances, price_vnd=3460.0)

    assert has_enough_solar is False
    assert warning_message is not None
    assert total_surplus_kwh == 0.0
    assert total_savings_vnd == 0
    assert len(scheduled) == 0
