import os
import sys
import time
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import gradio as gr
from fastapi.staticfiles import StaticFiles

# Ensure backend directory is in python search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.app.main import app as fastapi_app
from backend.app.engine.model_runner import runner
from backend.app.engine.decision import run_decision_engine
from backend.app.schemas import ApplianceSchema

# ------------------------------------------------------------------------------
# Core Prediction & Plotting Function
# ------------------------------------------------------------------------------
def run_forecast(
    scenario_choice: str,
    panel_capacity_kwp: float,
    electricity_price_vnd: float,
    washer_enabled: bool,
    washer_kwh: float,
    ev_enabled: bool,
    ev_kwh: float,
    heater_enabled: bool,
    heater_kwh: float,
):
    # Map scenario selection
    scenario_keys = {
        "☀️ High Solar Peak (#7200)": "sunny",
        "⛅ Moderate Solar (#7000)": "moderate",
        "🌧️ Cloudy / Dark Day (Guardrail #6761)": "cloudy",
        "🌐 Live Day-Ahead Simulation": "live",
    }
    scenario_id = scenario_keys.get(scenario_choice, "moderate")
    panel_factor = max(0.2, panel_capacity_kwp / 5.0)

    # 1. Run TimeXer AI Model Inference
    pred_24h, latency_ms, scenario_label = runner.predict(
        panel_factor=panel_factor,
        scenario_id=scenario_id,
    )

    # 2. Build Appliances list
    appliances = []
    if washer_enabled:
        appliances.append(ApplianceSchema(id="washer", name="Washing Machine", powerKwh=float(washer_kwh), isEnabled=True))
    if ev_enabled:
        appliances.append(ApplianceSchema(id="ev", name="E-Scooter / EV", powerKwh=float(ev_kwh), isEnabled=True))
    if heater_enabled:
        appliances.append(ApplianceSchema(id="heater", name="Water Heater", powerKwh=float(heater_kwh), isEnabled=True))

    # 3. Run Decision Engine
    (
        best_start,
        best_end,
        total_surplus_kwh,
        has_enough_solar,
        warning_msg,
        total_savings_vnd,
        monthly_projected_vnd,
        scheduled,
        comparison,
    ) = run_decision_engine(
        net_load_24h=pred_24h,
        appliances=appliances,
        price_vnd=float(electricity_price_vnd),
    )

    # 4. Telemetry Markdown
    device_name = str(runner.device).upper()
    status_icon = "🟢" if runner.is_loaded else "🟡"
    telemetry_md = f"""
    <div style="display: flex; gap: 16px; flex-wrap: wrap; padding: 12px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; font-size: 13px;">
        <div><b>Engine:</b> {status_icon} TimeXer PyTorch ({device_name})</div>
        <div><b>Parameters:</b> 1,705,755</div>
        <div><b>Latency:</b> <span style="color: #059669; font-weight: bold;">{latency_ms:.1f} ms</span></div>
        <div><b>Scenario:</b> {scenario_label}</div>
    </div>
    """

    # 5. Guardrail / Status Alert
    if not has_enough_solar:
        alert_md = f"""
        <div style="padding: 12px 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 16px; color: #92400e;">
            ⚠️ <b>Safety Guardrail Triggered:</b> {warning_msg}
        </div>
        """
    else:
        alert_md = f"""
        <div style="padding: 12px 16px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; margin-bottom: 16px; color: #166534;">
            ✨ <b>Optimal Window Found:</b> <b>{best_start}:00 - {best_end}:00</b> with <b>{total_surplus_kwh:.2f} kWh</b> solar surplus. Shifting saves <b>{total_savings_vnd:,} VND/day</b> (~<b>{monthly_projected_vnd:,} VND/month</b>).
        </div>
        """

    # 6. Bi-directional 24h Plotly Net-Load Chart
    hours = [f"{h}h" for h in range(24)]
    buy_bars = np.maximum(0.0, pred_24h)
    surplus_bars = -np.maximum(0.0, -pred_24h)

    fig = go.Figure()

    # Grid Purchase Bars (Blue)
    fig.add_trace(go.Bar(
        x=hours,
        y=buy_bars,
        name="Grid Buy (kWh)",
        marker_color="#2563eb",
        hovertemplate="Hour %{x}: Buy %{y:.2f} kWh<extra></extra>",
    ))

    # Solar Surplus Bars (Sky Blue / Cyan)
    fig.add_trace(go.Bar(
        x=hours,
        y=surplus_bars,
        name="Solar Surplus (kWh)",
        marker_color="#38bdf8",
        hovertemplate="Hour %{x}: Surplus %{customdata:.2f} kWh<extra></extra>",
        customdata=-surplus_bars,
    ))

    # Highlight Optimal 3-Hour Solar Window
    if has_enough_solar:
        fig.add_vrect(
            x0=best_start - 0.5,
            x1=best_end - 0.5,
            fillcolor="#fef08a",
            opacity=0.35,
            layer="below",
            line_width=1.5,
            line_dash="dot",
            line_color="#ca8a04",
            annotation_text=f"Optimal Solar Window: {best_start}h - {best_end}h",
            annotation_position="top left",
        )

    fig.update_layout(
        title="24-Hour Day-Ahead Solar Net-Load Forecast (kWh/h)",
        xaxis_title="Hour of Tomorrow (0h - 23h)",
        yaxis_title="Net Load (Negative = Solar Surplus, Positive = Grid Buy)",
        barmode="relative",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=40, r=40, t=60, b=40),
        height=380,
        plot_bgcolor="#ffffff",
        paper_bgcolor="#ffffff",
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9"),
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", zeroline=True, zerolinecolor="#64748b", zerolinewidth=1.5),
    )

    # 7. Scheduled Appliances Dataframe
    if scheduled:
        sched_rows = []
        for item in scheduled:
            sched_rows.append({
                "Appliance": item.name,
                "Time Window": f"{item.startHour}:00 - {item.endHour}:00",
                "Energy Shifted": f"{item.powerKwh:.1f} kWh",
                "Daily Savings": f"{item.savingsVnd:,} VND",
            })
        sched_df = pd.DataFrame(sched_rows)
    else:
        sched_df = pd.DataFrame([{
            "Appliance": "No appliances shifted",
            "Time Window": "N/A",
            "Energy Shifted": "0 kWh",
            "Daily Savings": "0 VND",
        }])

    # 8. Comparison summary
    comp_md = f"""
    ### 📊 Benchmark Comparison vs 11:00 - 14:00 Heuristic
    * **TimeXer AI Dynamic Shifting:** **{total_savings_vnd:,} VND/day**
    * **Traditional Fixed (11h-14h) Shifting:** **{comparison.heuristicSavingsVnd:,} VND/day**
    * **Efficiency Gain:** **+{comparison.percentGain}%** {'(Avoided cloudy dip!)' if comparison.avoidedCloudDrop else ''}
    """

    return telemetry_md, alert_md, fig, sched_df, comp_md


# ------------------------------------------------------------------------------
# Build Gradio UI
# ------------------------------------------------------------------------------
custom_css = """
.gradio-container { max-width: 1100px !important; margin: auto !important; font-family: system-ui, -apple-system, sans-serif; }
#title-header { text-align: center; margin-bottom: 12px; }
"""

with gr.Blocks(title="TimeXer AI - Solar Net-Load Forecasting") as demo:
    gr.HTML("""
    <div id="title-header">
        <h1 style="font-size: 26px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">
            ⚡ TimeXer AI - Day-Ahead Solar Net-Load & Smart Shifting
        </h1>
        <p style="font-size: 14px; color: #64748b; margin: 0;">
            Powered by Google DeepMind's TimeXer Architecture • Free Day-Ahead Load Shifting Optimizer
        </p>
    </div>
    """)

    with gr.Tabs():
        with gr.Tab("📊 Interactive AI Forecaster & Schedule Optimizer"):
            with gr.Row():
                with gr.Column(scale=4):
                    gr.Markdown("### ⚙️ System Configuration")
                    scenario_input = gr.Dropdown(
                        label="Day-Ahead Weather Scenario",
                        choices=[
                            "☀️ High Solar Peak (#7200)",
                            "⛅ Moderate Solar (#7000)",
                            "🌧️ Cloudy / Dark Day (Guardrail #6761)",
                            "🌐 Live Day-Ahead Simulation",
                        ],
                        value="☀️ High Solar Peak (#7200)",
                    )
                    panel_kwp_input = gr.Slider(
                        minimum=1.0, maximum=20.0, value=5.0, step=0.5, label="Rooftop Solar Capacity (kWp)"
                    )
                    price_input = gr.Number(value=3460, label="EVN Peak Electricity Price (VND/kWh)")

                    gr.Markdown("### 🔌 Flexible Appliances")
                    with gr.Row():
                        washer_check = gr.Checkbox(value=True, label="Washing Machine")
                        washer_kw = gr.Number(value=1.5, label="Energy (kWh)", precision=1)
                    with gr.Row():
                        ev_check = gr.Checkbox(value=True, label="E-Scooter / EV")
                        ev_kw = gr.Number(value=2.0, label="Energy (kWh)", precision=1)
                    with gr.Row():
                        heater_check = gr.Checkbox(value=True, label="Water Heater")
                        heater_kw = gr.Number(value=2.5, label="Energy (kWh)", precision=1)

                    btn_run = gr.Button("⚡ Run Day-Ahead TimeXer Forecast", variant="primary", size="lg")

                with gr.Column(scale=7):
                    telemetry_output = gr.HTML()
                    alert_output = gr.HTML()
                    chart_output = go_plot = gr.Plot(label="24h Net-Load Forecast")
                    gr.Markdown("### 📋 Smart Schedule Dispatch")
                    table_output = gr.Dataframe(headers=["Appliance", "Time Window", "Energy Shifted", "Daily Savings"])
                    comparison_output = gr.Markdown()

            # Wire up trigger
            inputs = [
                scenario_input,
                panel_kwp_input,
                price_input,
                washer_check,
                washer_kw,
                ev_check,
                ev_kw,
                heater_check,
                heater_kw,
            ]
            outputs = [telemetry_output, alert_output, chart_output, table_output, comparison_output]

            btn_run.click(fn=run_forecast, inputs=inputs, outputs=outputs)
            demo.load(fn=run_forecast, inputs=inputs, outputs=outputs)

        with gr.Tab("📱 Full Mobile App Experience"):
            gr.HTML("""
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
                    Authentic iPhone chassis experience running the live React 19 + Vite frontend.
                </p>
                <iframe src="/mobile/" style="width: 420px; height: 860px; border: 1px solid #cbd5e1; border-radius: 36px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);"></iframe>
            </div>
            """)

        with gr.Tab("📖 Architecture & Documentation"):
            gr.Markdown("""
            ### 🏗️ TimeXer System Architecture
            * **Deep Learning Core**: TimeXer model (2 layers, 8 heads, 256 d_model, 1.71M parameters).
            * **Input**: 168 hours (7 days) historical net-load + exogenous weather series (GHI, clouds, temp, rh, wind).
            * **Forecast Horizon**: 27 hours ahead, first 3 hours dropped (21h-24h) to yield 24 hours of tomorrow (0h-24h).
            * **Optimization**: Sliding 3-hour window between 6h and 15h to maximize captured solar thặng dư quang điện.
            * **Guardrail**: If solar surplus < 1.0 kWh, shifts are halted to prevent peak grid penalties.
            """)

# ------------------------------------------------------------------------------
# Mount FastAPI Endpoints and Static Frontend
# ------------------------------------------------------------------------------
# 1. Mount static frontend build at /mobile if available
FRONTEND_DIST = os.path.join(CURRENT_DIR, "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    demo.app.mount("/mobile", StaticFiles(directory=FRONTEND_DIST, html=True), name="mobile_frontend")

# 2. Transfer FastAPI API routes into demo.app
for route in fastapi_app.routes:
    if hasattr(route, "path") and route.path.startswith("/api"):
        demo.app.routes.insert(0, route)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"--> [TimeXer App] Launching Gradio + FastAPI on port {port}...")
    demo.launch(server_name="0.0.0.0", server_port=port)

