"""AI quality gate: chạy trong CI trước khi cho phép deploy.

Kiểm tra checkpoint TimeXer trên tập test (20% cuối của Solar_Customer_1, đúng split lúc huấn luyện):
  1. Checkpoint nạp được, đúng kiến trúc.
  2. Dự báo không có NaN/Inf.
  3. Sai số (MAE) dưới ngưỡng và phải thắng baseline seasonal-naive (lặp lại ngày hôm trước).
  4. Độ trễ suy luận nằm trong ngân sách cho server CPU (Render free).
"""
import time

import numpy as np
import pytest
import torch

from app.config import MODEL_CONFIG as C
from app.engine.model_runner import runner

MAX_MAE_KWH = 0.55          # ngưỡng chất lượng tuyệt đối (kWh/h)
MAX_LATENCY_MS = 2000       # ngân sách cho 1 lần dự báo trên CPU


@pytest.fixture(scope="module")
def test_split():
    vals = (runner.df_data[runner.feature_cols].values - runner.mean) / runner.std
    n = len(vals)
    xs, ys = [], []
    for i in range(int(n * 0.8), n - C.seq_len - C.pred_len, 24):
        xs.append(vals[i : i + C.seq_len])
        ys.append(vals[i + C.seq_len - C.label_len : i + C.seq_len + C.pred_len])
    x = torch.tensor(np.array(xs), dtype=torch.float32)
    y = torch.tensor(np.array(ys), dtype=torch.float32)
    dec = torch.cat([y[:, : C.label_len], torch.zeros_like(y[:, -C.pred_len :])], dim=1)
    x_mark = torch.zeros(len(x), C.seq_len, 4)
    y_mark = torch.zeros(len(x), C.label_len + C.pred_len, 4)
    dev = runner.device
    with torch.no_grad():
        pred = runner.model(x.to(dev), x_mark.to(dev), dec.to(dev), y_mark.to(dev))
    pred = pred[:, -C.pred_len :, 0].cpu().numpy()
    true = y[:, -C.pred_len :, -1].numpy()
    last_day = x[:, -24:, -1].numpy()
    naive = np.concatenate([last_day, last_day[:, : C.pred_len - 24]], axis=1)
    return pred, true, naive


def test_checkpoint_loaded():
    assert runner.is_loaded, "checkpoint.pth không nạp được"
    assert runner.total_parameters > 1_000_000


def test_predictions_are_finite(test_split):
    pred, _, _ = test_split
    assert np.isfinite(pred).all()


def test_mae_below_threshold_and_beats_naive(test_split):
    pred, true, naive = test_split
    scale = runner.std[-1]
    mae = np.abs(pred - true).mean() * scale
    naive_mae = np.abs(naive - true).mean() * scale
    print(f"\nTimeXer MAE = {mae:.3f} kWh | seasonal-naive MAE = {naive_mae:.3f} kWh")
    assert mae <= MAX_MAE_KWH
    assert mae < naive_mae, "model không tốt hơn baseline đơn giản"


def test_inference_latency():
    runner.predict(scenario_id="moderate")  # warm-up
    t = time.perf_counter()
    pred_24h, _, _ = runner.predict(scenario_id="moderate")
    ms = (time.perf_counter() - t) * 1000
    print(f"\nlatency = {ms:.1f} ms")
    assert len(pred_24h) == 24
    assert ms < MAX_LATENCY_MS


def test_cloudy_day_triggers_guardrail():
    from fastapi.testclient import TestClient
    from app.main import app

    payload = {
        "appliances": [{"id": "washer", "name": "Washer", "powerKwh": 1.0, "isEnabled": True}],
        "config": {
            "inverterModel": "x", "inverterConnected": True, "panelCapacityKwp": 5.0,
            "location": "Hanoi", "electricityPriceVnd": 3460,
        },
        "scenarioId": "cloudy",
    }
    data = TestClient(app).post("/api/forecast", json=payload).json()
    assert data["hasEnoughSolar"] is False
    assert data["scheduledAppliances"] == []
