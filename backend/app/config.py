import os
import sys
from types import SimpleNamespace

# Base paths for standalone production app
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = BACKEND_DIR

# Ensure BACKEND_DIR is at the top of sys.path so models, layers, utils resolve locally
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Trained checkpoint path (strictly local inside standalone backend directory)
CHECKPOINT_PATH = os.environ.get(
    "TIMEXER_CHECKPOINT",
    os.path.join(BACKEND_DIR, "checkpoints", "checkpoint.pth"),
)

# Reference dataset for scaler and historical seed series (strictly local inside standalone backend)
DATASET_PATH = os.environ.get(
    "TIMEXER_DATASET",
    os.path.join(BACKEND_DIR, "data", "Solar_Customer_1.csv"),
)

# Test results directory
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")

# Model configuration matching Solar_C1_168_27 run
MODEL_CONFIG = SimpleNamespace(
    task_name="long_term_forecast",
    seq_len=168,
    label_len=48,
    pred_len=27,
    enc_in=6,
    dec_in=6,
    c_out=1,
    d_model=256,
    d_ff=512,
    n_heads=8,
    e_layers=2,
    d_layers=1,
    factor=1,
    dropout=0.1,
    embed="timeF",
    freq="h",
    activation="gelu",
    output_attention=False,
    patch_len=16,
    channel_independence=1,
    decomp_method="moving_avg",
    top_k=5,
    features="MS",
    use_norm=1,
)

# Decision and electricity pricing
DEFAULT_PRICE_KWH_VND = 3460  # EVN Tier 6
MIN_SURPLUS_THRESHOLD_KWH = 1.0  # Guardrail from docs/product

# Location coordinates for Open-Meteo
LOCATION_COORDS = {
    "Hanoi": {"lat": 21.0285, "lon": 105.8542},
    "Ho Chi Minh City": {"lat": 10.8231, "lon": 106.6297},
    "Da Nang": {"lat": 16.0544, "lon": 108.2022},
    "Sydney": {"lat": -33.8688, "lon": 151.2093},
}
