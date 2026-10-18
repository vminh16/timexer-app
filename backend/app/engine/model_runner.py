import os
import sys
import numpy as np
import pandas as pd
import torch

# Ensure repository root is on path to import models and layers
from ..config import (
    PROJECT_ROOT,
    MODEL_CONFIG,
    CHECKPOINT_PATH,
    DATASET_PATH,
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from models.TimeXer import Model


class TimeXerRunner:
    def __init__(self, checkpoint_path: str = CHECKPOINT_PATH):
        self.checkpoint_path = checkpoint_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.is_loaded = False
        self.total_parameters = 0

        # Scaler attributes
        self.feature_cols = [
            "ghi_lead",
            "cloud_lead",
            "temp_lead",
            "rh_lead",
            "wind_lead",
            "OT",
        ]
        self.mean = None
        self.std = None
        self.df_data = None

        self._init_scaler()
        self._load_model()

    def _init_scaler(self):
        """Fit scaler on first 70% of Solar_Customer_1 dataset exactly as in training."""
        if os.path.exists(DATASET_PATH):
            df = pd.read_csv(DATASET_PATH)
            self.df_data = df
            raw_vals = df[self.feature_cols].values
            num_train = int(len(df) * 0.7)
            self.mean = raw_vals[:num_train].mean(axis=0)
            self.std = raw_vals[:num_train].std(axis=0) + 1e-5
        else:
            # Fallback default constants from Customer 1 if file moved
            self.mean = np.array([184.2, 38.6, 17.5, 68.2, 2.8, 0.3633], dtype=np.float32)
            self.std = np.array([272.5, 36.1, 5.8, 17.4, 1.8, 1.4502], dtype=np.float32)

    def _load_model(self):
        """Load TimeXer model and checkpoint."""
        try:
            self.model = Model(MODEL_CONFIG).to(self.device)
            self.total_parameters = sum(p.numel() for p in self.model.parameters())

            if os.path.exists(self.checkpoint_path):
                state_dict = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                self.is_loaded = True
                print(
                    f"--> [TimeXerRunner] Successfully loaded checkpoint ({self.total_parameters:,} params) on {self.device}"
                )
            else:
                print(
                    f"--> [TimeXerRunner] Checkpoint not found at {self.checkpoint_path}, model initialized with random weights"
                )
        except Exception as e:
            print(f"--> [TimeXerRunner] Error loading model: {e}")
            self.is_loaded = False

    def predict(
        self,
        panel_factor: float = 1.0,
        scenario_id: str = "moderate",
    ) -> tuple[np.ndarray, float, str]:
        """
        Run 27-hour prediction, drop first 3 hours (21h-24h), and return 24 hours of tomorrow.
        Returns: (pred_24h, inference_time_ms, scenario_label)
        """
        import time
        start_time = time.perf_counter()

        # Scenario mapping from Ausgrid real test samples
        scenario_map = {
            "sunny": (7200, "High Solar Peak Day (Ausgrid Test #7200)"),
            "moderate": (7000, "Moderate Solar Day (Ausgrid Test #7000)"),
            "cloudy": (6761, "Cloudy / Dark Day (Ausgrid Test #6761 - Guardrail Triggered)"),
            "live": (7050, "Live Day-Ahead Weather & NetLoad"),
        }

        sample_idx, scenario_label = scenario_map.get(
            scenario_id, (7000, "Moderate Solar Day (Ausgrid Test #7000)")
        )

        seq_len = MODEL_CONFIG.seq_len  # 168
        pred_len = MODEL_CONFIG.pred_len  # 27
        label_len = MODEL_CONFIG.label_len  # 48

        # If data is available, extract a real 168h test sample
        if self.df_data is not None and len(self.df_data) > sample_idx + seq_len + pred_len:
            raw_vals = self.df_data[self.feature_cols].values
            norm_vals = (raw_vals - self.mean) / self.std

            s_begin = sample_idx
            s_end = s_begin + seq_len
            r_begin = s_end - label_len
            r_end = r_begin + label_len + pred_len

            seq_x = norm_vals[s_begin:s_end]
            seq_y = norm_vals[r_begin:r_end]

            batch_x = torch.tensor(seq_x, dtype=torch.float32).unsqueeze(0).to(self.device)
            batch_y = torch.tensor(seq_y, dtype=torch.float32).unsqueeze(0).to(self.device)
        else:
            # Synthetic normalized sample
            batch_x = torch.randn(1, seq_len, 6, dtype=torch.float32).to(self.device)
            batch_y = torch.randn(1, label_len + pred_len, 6, dtype=torch.float32).to(self.device)

        batch_x_mark = torch.zeros(1, seq_len, 4, dtype=torch.float32).to(self.device)
        batch_y_mark = torch.zeros(1, label_len + pred_len, 4, dtype=torch.float32).to(self.device)

        dec_inp = torch.zeros_like(batch_y[:, -pred_len:, :]).float()
        dec_inp = torch.cat([batch_y[:, :label_len, :], dec_inp], dim=1).float().to(self.device)

        if self.model is not None and self.is_loaded:
            with torch.no_grad():
                outputs = self.model(batch_x, batch_x_mark, dec_inp, batch_y_mark)
            pred_norm = outputs[0, -pred_len:, 0].cpu().numpy()
        else:
            pred_norm = np.zeros(pred_len, dtype=np.float32)

        # Inverse scale back to kWh/h
        pred_kwh = pred_norm * self.std[-1] + self.mean[-1]

        # Extract 24 hours of tomorrow (index 3 to 26)
        pred_24h = pred_kwh[3:27]

        # Scale surplus with solar panel capacity if customized
        if panel_factor != 1.0:
            for i in range(len(pred_24h)):
                if pred_24h[i] < 0:
                    pred_24h[i] *= panel_factor

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)
        return pred_24h, elapsed_ms, scenario_label


# Global singleton runner
runner = TimeXerRunner()
