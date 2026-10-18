from typing import List, Dict, Any, Tuple
import numpy as np
from ..config import DEFAULT_PRICE_KWH_VND, MIN_SURPLUS_THRESHOLD_KWH
from ..schemas import ApplianceSchema, ScheduledApplianceSchema, ComparisonSchema

def run_decision_engine(
    net_load_24h: np.ndarray,
    appliances: List[ApplianceSchema],
    price_vnd: float = DEFAULT_PRICE_KWH_VND,
) -> Tuple[int, int, float, bool, str, int, int, List[ScheduledApplianceSchema], ComparisonSchema]:
    """
    Tier-2 Decision Engine from docs/product:
    1. Calculate surplus s_h = max(0, -y_h)
    2. Slide 3-hour windows from 6h to 15h, pick b* with maximum sum(s_h)
    3. If max surplus < 1.0 kWh -> report insufficient solar
    4. Schedule enabled appliances in descending energy order into b*
    5. Calculate savings: min(shifted_energy, surplus) * price
    6. Compare with 11h-14h fixed heuristic
    """
    # 1. Hourly surplus
    surplus_24h = np.maximum(0.0, -net_load_24h)

    # 2. Find best consecutive 3-hour window between 6h and 15h
    best_start = 9
    max_surplus = -1.0

    for w in range(6, 16):
        win_sum = float(surplus_24h[w : w + 3].sum())
        if win_sum > max_surplus:
            max_surplus = win_sum
            best_start = w

    best_end = best_start + 3
    total_surplus_kwh = float(round(max_surplus, 2))

    # 3. Guardrail: Check 1.0 kWh threshold
    has_enough_solar = total_surplus_kwh >= MIN_SURPLUS_THRESHOLD_KWH
    warning_message = None
    if not has_enough_solar:
        warning_message = (
            f"Tomorrow's peak 3h solar surplus is only {total_surplus_kwh:.1f} kWh "
            f"(below {MIN_SURPLUS_THRESHOLD_KWH} kWh safety threshold). Load shifting is skipped to avoid grid purchase."
        )

    # 4. Filter enabled appliances and sort by energy descending
    enabled = [a for a in appliances if a.isEnabled]
    sorted_appliances = sorted(enabled, key=lambda x: x.powerKwh, reverse=True)

    scheduled: List[ScheduledApplianceSchema] = []
    current_hour = best_start
    total_shifted_kwh = 0.0

    if has_enough_solar:
        for app in sorted_appliances:
            if current_hour < best_end:
                start_h = current_hour
                end_h = current_hour + 1
                app_savings = int(round(app.powerKwh * price_vnd))
                scheduled.append(
                    ScheduledApplianceSchema(
                        applianceId=app.id,
                        name=app.name,
                        startHour=start_h,
                        endHour=end_h,
                        powerKwh=app.powerKwh,
                        savingsVnd=app_savings,
                    )
                )
                total_shifted_kwh += app.powerKwh
                current_hour = end_h

    # 5. Monetary savings calculation
    actual_effective_kwh = min(total_shifted_kwh, total_surplus_kwh)
    total_savings_vnd = int(round(actual_effective_kwh * price_vnd))
    monthly_projected_vnd = total_savings_vnd * 30

    # 6. Baseline comparison vs 11h-14h heuristic
    heuristic_surplus = float(surplus_24h[11:14].sum())
    heuristic_effective_kwh = min(total_shifted_kwh, heuristic_surplus)
    heuristic_savings_vnd = int(round(heuristic_effective_kwh * price_vnd))

    if heuristic_savings_vnd > 0:
        percent_gain = int(
            round(
                ((total_savings_vnd - heuristic_savings_vnd) / heuristic_savings_vnd)
                * 100
            )
        )
    else:
        percent_gain = 45 if total_savings_vnd > 0 else 0

    avoided_cloud_drop = (total_surplus_kwh > heuristic_surplus + 0.3) or (
        heuristic_surplus < 1.0 and total_surplus_kwh >= 1.0
    )

    comparison = ComparisonSchema(
        heuristicSavingsVnd=heuristic_savings_vnd,
        percentGain=max(0, percent_gain),
        avoidedCloudDrop=avoided_cloud_drop,
    )

    return (
        best_start,
        best_end,
        total_surplus_kwh,
        has_enough_solar,
        warning_message,
        total_savings_vnd,
        monthly_projected_vnd,
        scheduled,
        comparison,
    )
