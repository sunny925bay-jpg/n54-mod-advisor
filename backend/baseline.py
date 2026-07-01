"""
Baseline recommendation engine: average-gain lookup from dyno_data.csv.
No ML — computes mean whp/wtq per mod category, diffs against user's current config.
Replaced by model_inference.py in Phase 2 without changing the API contract.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Optional

from risk_engine import evaluate_rules, compute_risk_score

DATA_DIR = Path(__file__).parent.parent / "data"

TUNE_ORDER    = ["stock", "jb4_s1", "mhd_s1", "jb4_s2", "mhd_s2",
                  "mhd_s2plus", "mhd_custom", "cobb", "custom"]
FUEL_ORDER    = ["91", "93", "e30", "e50", "e85"]
FUELING_ORDER = ["stock_hpfp", "upg_hpfp", "meth", "port_inj", "port_inj_meth"]

BINARY_MODS = [
    "downpipe", "charge_pipes", "intercooler",
    "intake", "catback", "bov_delete", "oil_cooler",
]

EXPLANATIONS = {
    "downpipe":        "Catless downpipe cuts exhaust backpressure and is required for Stage 2 tune.",
    "charge_pipes":    "Upgraded charge pipes eliminate boost leaks under higher boost levels.",
    "intercooler":     "FMIC drops charge temps, reducing knock risk and enabling more aggressive timing.",
    "intake":          "Cold air intake improves airflow; gains are modest without a supporting tune.",
    "catback":         "Cat-back reduces backpressure marginally on a stock-turbo car; mainly acoustic.",
    "bov_delete":      "BOV delete keeps boost in the system; small gain, reduces turbo lag sensation.",
    "oil_cooler":      "Oil cooler cuts heat soak on track sessions; minimal WHP gain, longevity benefit.",
    "tune_upgrade":    "Tune unlocks higher boost targets and optimized fueling for your current mod level.",
    "fuel_upgrade":    "Higher ethanol allows more timing advance and higher boost, increasing output.",
    "fueling_upgrade": "Upgraded fueling hardware enables higher ethanol blends and supports more power.",
}


def _to_float(val: str, default: float = 0.0) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _load_rows() -> list[dict]:
    rows = []
    with open(DATA_DIR / "dyno_data.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("id", "").strip():
                rows.append(row)
    return rows


def _avg_by_col(rows: list[dict], col: str) -> dict[str, tuple[float, float]]:
    groups: dict[str, list] = defaultdict(list)
    for r in rows:
        val = r.get(col, "").strip()
        if val:
            groups[val].append((_to_float(r["whp"]), _to_float(r["wtq"])))
    return {
        k: (
            round(sum(x for x, _ in v) / len(v), 1),
            round(sum(y for _, y in v) / len(v), 1),
        )
        for k, v in groups.items()
    }


def _build_lookup(rows):
    binary_gains: dict[str, tuple[float, float]] = {}
    for mod in BINARY_MODS:
        with_mod    = [r for r in rows if r.get(mod) == "1"]
        without_mod = [r for r in rows if r.get(mod) == "0"]
        if with_mod and without_mod:
            def _avg(rs, col):
                return sum(_to_float(r[col]) for r in rs) / len(rs)
            binary_gains[mod] = (
                round(_avg(with_mod, "whp") - _avg(without_mod, "whp"), 1),
                round(_avg(with_mod, "wtq") - _avg(without_mod, "wtq"), 1),
            )
    return binary_gains, _avg_by_col(rows, "tune"), _avg_by_col(rows, "fuel"), _avg_by_col(rows, "fueling_hw")


def _next(order: list[str], current: str) -> Optional[str]:
    try:
        idx = order.index(current)
        return order[idx + 1] if idx + 1 < len(order) else None
    except ValueError:
        return None


# ── Load once at startup ───────────────────────────────────────────────────────
_rows = _load_rows()
_binary_gains, _tune_avgs, _fuel_avgs, _fueling_avgs = _build_lookup(_rows)

with open(DATA_DIR / "prices.json", encoding="utf-8") as _f:
    _prices: dict = json.load(_f)
# ──────────────────────────────────────────────────────────────────────────────


def predict(config: dict) -> tuple[float, float]:
    """Rough prediction from tune + fuel averages (baseline only)."""
    return estimate_current(
        tune=config.get("tune", "stock"),
        fuel=config.get("fuel", "93"),
    )


def estimate_current(tune: str, fuel: str, **kwargs) -> tuple[float, float]:
    t = _tune_avgs.get(tune)
    f = _fuel_avgs.get(fuel)
    if t and f:
        return round((t[0] + f[0]) / 2, 1), round((t[1] + f[1]) / 2, 1)
    return (t or f or (278.0, 312.0))


def get_recommendations(
    fuel: str,
    fueling_hw: str,
    tune: str,
    installed_mods: set[str],
    goal: str,
    chassis: str = "e92",
    year: int = 2010,
    target_hp: Optional[int] = None,
) -> list[dict]:
    candidates = []
    base_whp, _ = estimate_current(tune=tune, fuel=fuel)
    mod_state = {m: (1 if m in installed_mods else 0) for m in BINARY_MODS}

    for mod in BINARY_MODS:
        if mod in installed_mods or mod not in _binary_gains:
            continue
        whp_gain, wtq_gain = _binary_gains[mod]
        cost = _prices.get(mod, {}).get("cost_usd", 0)
        config_with = {"fuel": fuel, "fueling_hw": fueling_hw, "tune": tune, **mod_state, mod: 1}
        flags = evaluate_rules(config_with, base_whp + whp_gain)
        candidates.append({
            "mod": mod,
            "predicted_whp_gain": whp_gain,
            "predicted_wtq_gain": wtq_gain,
            "cost_usd": cost,
            "hp_per_dollar": round(whp_gain / cost, 4) if cost > 0 else 0.0,
            "reasoning": EXPLANATIONS.get(mod, ""),
            "explanation": "",
            "parts": [],
            "risk_flags": flags,
            "risk_score": compute_risk_score(flags),
        })

    next_tune = _next(TUNE_ORDER, tune)
    if next_tune and tune in _tune_avgs and next_tune in _tune_avgs:
        whp_gain = round(_tune_avgs[next_tune][0] - _tune_avgs[tune][0], 1)
        wtq_gain = round(_tune_avgs[next_tune][1] - _tune_avgs[tune][1], 1)
        if whp_gain > 0:
            cost = _prices.get(f"tune_{next_tune}", {}).get("cost_usd", 150)
            config_with = {"fuel": fuel, "fueling_hw": fueling_hw, "tune": next_tune, **mod_state}
            flags = evaluate_rules(config_with, base_whp + whp_gain)
            candidates.append({
                "mod": f"tune → {next_tune}",
                "predicted_whp_gain": whp_gain,
                "predicted_wtq_gain": wtq_gain,
                "cost_usd": cost,
                "hp_per_dollar": round(whp_gain / cost, 4) if cost > 0 else 0.0,
                "reasoning": EXPLANATIONS["tune_upgrade"],
                "explanation": "",
                "parts": [],
                "risk_flags": flags,
                "risk_score": compute_risk_score(flags),
            })

    next_fuel = _next(FUEL_ORDER, fuel)
    if next_fuel and fuel in _fuel_avgs and next_fuel in _fuel_avgs:
        whp_gain = round(_fuel_avgs[next_fuel][0] - _fuel_avgs[fuel][0], 1)
        wtq_gain = round(_fuel_avgs[next_fuel][1] - _fuel_avgs[fuel][1], 1)
        if whp_gain > 0:
            config_with = {"fuel": next_fuel, "fueling_hw": fueling_hw, "tune": tune, **mod_state}
            flags = evaluate_rules(config_with, base_whp + whp_gain)
            candidates.append({
                "mod": f"fuel → {next_fuel}",
                "predicted_whp_gain": whp_gain,
                "predicted_wtq_gain": wtq_gain,
                "cost_usd": 0,
                "hp_per_dollar": 999.0,
                "reasoning": EXPLANATIONS["fuel_upgrade"],
                "explanation": "",
                "parts": [],
                "risk_flags": flags,
                "risk_score": compute_risk_score(flags),
            })

    next_fueling = _next(FUELING_ORDER, fueling_hw)
    if next_fueling and fueling_hw in _fueling_avgs and next_fueling in _fueling_avgs:
        whp_gain = round(_fueling_avgs[next_fueling][0] - _fueling_avgs[fueling_hw][0], 1)
        wtq_gain = round(_fueling_avgs[next_fueling][1] - _fueling_avgs[fueling_hw][1], 1)
        if whp_gain > 0:
            cost = _prices.get(f"fueling_{next_fueling}", {}).get("cost_usd", 300)
            config_with = {"fuel": fuel, "fueling_hw": next_fueling, "tune": tune, **mod_state}
            flags = evaluate_rules(config_with, base_whp + whp_gain)
            candidates.append({
                "mod": f"fueling → {next_fueling}",
                "predicted_whp_gain": whp_gain,
                "predicted_wtq_gain": wtq_gain,
                "cost_usd": cost,
                "hp_per_dollar": round(whp_gain / cost, 4) if cost > 0 else 0.0,
                "reasoning": EXPLANATIONS["fueling_upgrade"],
                "explanation": "",
                "parts": [],
                "risk_flags": flags,
                "risk_score": compute_risk_score(flags),
            })

    if goal in ("best_value", "value"):
        candidates.sort(key=lambda x: x["hp_per_dollar"], reverse=True)
    elif goal == "reliability":
        candidates.sort(key=lambda x: x["predicted_whp_gain"] - x["risk_score"] * 10, reverse=True)
    elif goal == "target_hp":
        candidates.sort(key=lambda x: x["predicted_whp_gain"], reverse=True)
    else:  # "max_power" or legacy "power"
        candidates.sort(key=lambda x: x["predicted_whp_gain"], reverse=True)
    return candidates


def get_build_plan(
    fuel: str,
    fueling_hw: str,
    tune: str,
    installed_mods: set[str],
    target_whp: int,
    chassis: str = "e92",
    year: int = 2010,
) -> dict:
    """Greedy cheapest-path search using baseline avg-gain estimates."""
    current_whp, current_wtq = estimate_current(tune=tune, fuel=fuel)

    remaining_binary = [m for m in BINARY_MODS if m not in installed_mods]
    current_tune = tune
    current_fuel = fuel
    current_fueling = fueling_hw
    mod_state = {m: (1 if m in installed_mods else 0) for m in BINARY_MODS}

    steps: list[dict] = []
    total_cost = 0
    max_steps = len(BINARY_MODS) + len(TUNE_ORDER) + len(FUEL_ORDER) + len(FUELING_ORDER)

    for _ in range(max_steps):
        if current_whp >= target_whp:
            break

        candidates: list[dict] = []

        for mod in remaining_binary:
            if mod not in _binary_gains:
                continue
            whp_gain, wtq_gain = _binary_gains[mod]
            if whp_gain > 0:
                cost = _prices.get(mod, {}).get("cost_usd", 0)
                candidates.append({
                    "kind": "binary", "label": mod, "next_val": None,
                    "whp_gain": whp_gain, "wtq_gain": wtq_gain,
                    "cost": cost, "hpd": whp_gain / cost if cost > 0 else float("inf"),
                })

        next_tune = _next(TUNE_ORDER, current_tune)
        if next_tune and current_tune in _tune_avgs and next_tune in _tune_avgs:
            whp_gain = round(_tune_avgs[next_tune][0] - _tune_avgs[current_tune][0], 1)
            wtq_gain = round(_tune_avgs[next_tune][1] - _tune_avgs[current_tune][1], 1)
            if whp_gain > 0:
                cost = _prices.get(f"tune_{next_tune}", {}).get("cost_usd", 150)
                candidates.append({
                    "kind": "tune", "label": f"tune → {next_tune}", "next_val": next_tune,
                    "whp_gain": whp_gain, "wtq_gain": wtq_gain,
                    "cost": cost, "hpd": whp_gain / cost if cost > 0 else float("inf"),
                })

        next_fuel = _next(FUEL_ORDER, current_fuel)
        if next_fuel and current_fuel in _fuel_avgs and next_fuel in _fuel_avgs:
            whp_gain = round(_fuel_avgs[next_fuel][0] - _fuel_avgs[current_fuel][0], 1)
            wtq_gain = round(_fuel_avgs[next_fuel][1] - _fuel_avgs[current_fuel][1], 1)
            if whp_gain > 0:
                candidates.append({
                    "kind": "fuel", "label": f"fuel → {next_fuel}", "next_val": next_fuel,
                    "whp_gain": whp_gain, "wtq_gain": wtq_gain,
                    "cost": 0, "hpd": float("inf"),
                })

        next_fueling = _next(FUELING_ORDER, current_fueling)
        if next_fueling and current_fueling in _fueling_avgs and next_fueling in _fueling_avgs:
            whp_gain = round(_fueling_avgs[next_fueling][0] - _fueling_avgs[current_fueling][0], 1)
            wtq_gain = round(_fueling_avgs[next_fueling][1] - _fueling_avgs[current_fueling][1], 1)
            if whp_gain > 0:
                cost = _prices.get(f"fueling_{next_fueling}", {}).get("cost_usd", 300)
                candidates.append({
                    "kind": "fueling", "label": f"fueling → {next_fueling}", "next_val": next_fueling,
                    "whp_gain": whp_gain, "wtq_gain": wtq_gain,
                    "cost": cost, "hpd": whp_gain / cost if cost > 0 else float("inf"),
                })

        if not candidates:
            break

        best = max(candidates, key=lambda c: c["hpd"])
        current_whp = round(current_whp + best["whp_gain"], 1)
        current_wtq = round(current_wtq + best["wtq_gain"], 1)
        total_cost += best["cost"]
        steps.append({
            "mod": best["label"],
            "cumulative_whp": current_whp,
            "cumulative_wtq": current_wtq,
            "cost_usd": best["cost"],
        })

        if best["kind"] == "binary":
            remaining_binary.remove(best["label"])
            mod_state[best["label"]] = 1
        elif best["kind"] == "tune":
            current_tune = best["next_val"]
        elif best["kind"] == "fuel":
            current_fuel = best["next_val"]
        elif best["kind"] == "fueling":
            current_fueling = best["next_val"]

    reachable = current_whp >= target_whp
    config_final = {"fuel": current_fuel, "fueling_hw": current_fueling, "tune": current_tune, **mod_state}
    final_flags = evaluate_rules(config_final, current_whp)
    return {
        "steps": steps,
        "final_whp": current_whp,
        "final_wtq": current_wtq,
        "total_cost_usd": total_cost,
        "risk_flags": final_flags,
        "reachable": reachable,
        "message": (
            f"Target reached in {len(steps)} step(s)."
            if reachable
            else f"Not reachable with stock turbos. Max predicted: {current_whp} whp."
        ),
    }
