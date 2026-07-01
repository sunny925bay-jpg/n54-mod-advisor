"""
LightGBM inference layer with SHAP-based explanations.
Loads trained artifacts from model/ at startup.
Exposes predict() / estimate_current() / get_recommendations()
with the same signatures as baseline.py so main.py needs no logic changes.
"""

import json
import pickle
from pathlib import Path
from typing import Optional

import lightgbm as lgb
import numpy as np
import shap
from risk_engine import evaluate_rules, compute_risk_score

MODEL_DIR = Path(__file__).parent.parent / "model"
DATA_DIR  = Path(__file__).parent.parent / "data"

# Native LightGBM format — version-agnostic, no pickle compatibility issues
_whp_model = lgb.Booster(model_file=str(MODEL_DIR / "whp_model.txt"))
_wtq_model = lgb.Booster(model_file=str(MODEL_DIR / "wtq_model.txt"))
with open(MODEL_DIR / "encoders.pkl", "rb") as f:
    _enc = pickle.load(f)
with open(DATA_DIR / "prices.json", encoding="utf-8") as f:
    _prices: dict = json.load(f)
with open(DATA_DIR / "parts.json", encoding="utf-8") as f:
    _parts_catalog: dict = json.load(f)

# Cached at startup — TreeExplainer is exact and fast for tree models
_explainer = shap.TreeExplainer(_whp_model)

BINARY_MODS   = _enc["binary_mods"]
FUEL_ORDER    = _enc["fuel_order"]
FUELING_ORDER = _enc["fueling_order"]
TUNE_ORDER    = _enc["tune_order"]
FEATURE_NAMES = _enc["feature_names"]

FEATURE_LABELS = {
    "chassis":    "chassis type",
    "year":       "model year",
    "turbo_setup":"turbo setup",
    "fuel":       "fuel grade",
    "fueling_hw": "fueling hardware",
    "tune":       "tune level",
    "downpipe":   "downpipe",
    "charge_pipes":"charge pipes",
    "intercooler":"intercooler",
    "intake":     "intake",
    "catback":    "cat-back exhaust",
    "bov_delete": "BOV delete",
    "oil_cooler": "oil cooler",
    "dyno_type":  "dyno type",
}

REASONING = {
    "downpipe":        "Catless downpipe cuts exhaust backpressure; required for Stage 2 tune.",
    "charge_pipes":    "Upgraded charge pipes eliminate boost leaks under higher boost.",
    "intercooler":     "FMIC drops charge temps, reducing knock risk and enabling more aggressive timing.",
    "intake":          "Cold air intake improves airflow; gains are modest without a supporting tune.",
    "catback":         "Cat-back reduces backpressure marginally on a stock-turbo car; mainly acoustic.",
    "bov_delete":      "BOV delete keeps boost in the system; small gain, reduces turbo lag sensation.",
    "oil_cooler":      "Oil cooler cuts heat soak on track sessions; minimal WHP gain, longevity benefit.",
    "tune_upgrade":    "Tune unlocks higher boost targets and optimized fueling for your current mod level.",
    "fuel_upgrade":    "Higher ethanol allows more timing advance and higher boost, increasing output.",
    "fueling_upgrade": "Upgraded fueling hardware enables higher ethanol blends and supports more power.",
}


def _encode(config: dict) -> np.ndarray:
    def safe(mapping, val):
        return float(mapping.get(str(val).strip(), 0))

    vec = [
        safe(_enc["chassis_map"],  config.get("chassis", "e92")),
        float(config.get("year", 2010)),
        safe(_enc["turbo_map"],    config.get("turbo_setup", "stock")),
        safe(_enc["fuel_map"],     config.get("fuel", "93")),
        safe(_enc["fueling_map"],  config.get("fueling_hw", "stock_hpfp")),
        safe(_enc["tune_map"],     config.get("tune", "stock")),
        *[float(config.get(m, 0)) for m in BINARY_MODS],
        safe(_enc["dyno_map"],     config.get("dyno_type", "mustang")),
    ]
    return np.array([vec])


def predict(config: dict) -> tuple[float, float]:
    x = _encode(config)
    return round(float(_whp_model.predict(x)[0]), 1), round(float(_wtq_model.predict(x)[0]), 1)


def _lookup_parts(mod_feature: str, mod_label: str) -> list[dict]:
    """Return parts from the catalog matching the mod and target level."""
    catalog = _parts_catalog.get(mod_feature, [])
    if not catalog:
        return []

    if mod_feature == "tune":
        target = mod_label.split("→")[-1].strip()
        return [p for p in catalog if target in p.get("tune_levels", [])]

    if mod_feature == "fueling_hw":
        target = mod_label.split("→")[-1].strip()
        return [p for p in catalog if p.get("fueling_level") == target]

    return catalog  # binary mods: return all options in category


def _explain_gain(base_config: dict, mod_config: dict, mod_feature: str) -> str:
    """
    Compute SHAP delta between mod_config and base_config, identify top drivers,
    and return a short deterministic explanation string.
    """
    sv_base = _explainer.shap_values(_encode(base_config))[0]
    sv_mod  = _explainer.shap_values(_encode(mod_config))[0]
    delta   = sv_mod - sv_base

    # Map feature names to their SHAP contribution to the gain
    deltas = dict(zip(FEATURE_NAMES, delta))

    # Top drivers by absolute contribution, ignoring tiny noise (< 0.5 whp)
    drivers = sorted(
        [(k, abs(v)) for k, v in deltas.items() if abs(v) >= 0.5],
        key=lambda x: x[1], reverse=True,
    )

    primary_label   = FEATURE_LABELS.get(mod_feature, mod_feature)
    secondary_keys  = [k for k, _ in drivers if k != mod_feature][:2]
    secondary_labels = [FEATURE_LABELS.get(k, k) for k in secondary_keys]

    if not secondary_labels:
        return f"Gain is driven by the {primary_label} alone."
    if len(secondary_labels) == 1:
        return f"Driven by the {primary_label}; {secondary_labels[0]} is a contributing factor."
    return f"Driven by the {primary_label}; {secondary_labels[0]} and {secondary_labels[1]} also contribute."


def estimate_current(tune: str, fuel: str, **kwargs) -> tuple[float, float]:
    config = {
        "tune": tune, "fuel": fuel,
        "turbo_setup": "stock", "dyno_type": "mustang",
        **kwargs,
    }
    return predict(config)


def _next(order: list, current: str) -> Optional[str]:
    try:
        idx = order.index(current)
        return order[idx + 1] if idx + 1 < len(order) else None
    except ValueError:
        return None


def get_recommendations(
    fuel: str,
    fueling_hw: str,
    tune: str,
    installed_mods: set,
    goal: str,
    chassis: str = "e92",
    year: int = 2010,
    target_hp: Optional[int] = None,
) -> list[dict]:
    base = {
        "chassis": chassis, "year": year,
        "turbo_setup": "stock", "dyno_type": "mustang",
        "fuel": fuel, "fueling_hw": fueling_hw, "tune": tune,
        **{m: (1 if m in installed_mods else 0) for m in BINARY_MODS},
    }
    base_whp, base_wtq = predict(base)
    candidates = []

    def _add(mod_label, config_with, cost, reasoning_key, mod_feature):
        whp, wtq = predict(config_with)
        gain_whp = round(whp - base_whp, 1)
        gain_wtq = round(wtq - base_wtq, 1)
        if gain_whp <= 0:
            return
        explanation = _explain_gain(base, config_with, mod_feature)
        parts = _lookup_parts(mod_feature, mod_label)
        flags = evaluate_rules(config_with, whp)
        candidates.append({
            "mod": mod_label,
            "predicted_whp_gain": gain_whp,
            "predicted_wtq_gain": gain_wtq,
            "cost_usd": cost,
            "hp_per_dollar": round(gain_whp / cost, 4) if cost > 0 else 999.0,
            "reasoning": REASONING.get(reasoning_key, ""),
            "explanation": explanation,
            "parts": parts,
            "risk_flags": flags,
            "risk_score": compute_risk_score(flags),
        })

    for mod in BINARY_MODS:
        if mod in installed_mods:
            continue
        _add(mod, {**base, mod: 1},
             _prices.get(mod, {}).get("cost_usd", 0), mod, mod)

    next_tune = _next(TUNE_ORDER, tune)
    if next_tune:
        _add(f"tune → {next_tune}", {**base, "tune": next_tune},
             _prices.get(f"tune_{next_tune}", {}).get("cost_usd", 150),
             "tune_upgrade", "tune")

    next_fuel = _next(FUEL_ORDER, fuel)
    if next_fuel:
        _add(f"fuel → {next_fuel}", {**base, "fuel": next_fuel},
             0, "fuel_upgrade", "fuel")

    next_fueling = _next(FUELING_ORDER, fueling_hw)
    if next_fueling:
        _add(f"fueling → {next_fueling}", {**base, "fueling_hw": next_fueling},
             _prices.get(f"fueling_{next_fueling}", {}).get("cost_usd", 300),
             "fueling_upgrade", "fueling_hw")

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
    installed_mods: set,
    target_whp: int,
    chassis: str = "e92",
    year: int = 2010,
) -> dict:
    """Greedy cheapest-path search to target_whp using the LightGBM model."""
    config = {
        "chassis": chassis, "year": year,
        "turbo_setup": "stock", "dyno_type": "mustang",
        "fuel": fuel, "fueling_hw": fueling_hw, "tune": tune,
        **{m: (1 if m in installed_mods else 0) for m in BINARY_MODS},
    }
    current_whp, current_wtq = predict(config)

    remaining_binary = [m for m in BINARY_MODS if m not in installed_mods]
    current_tune = tune
    current_fuel = fuel
    current_fueling = fueling_hw

    steps: list[dict] = []
    total_cost = 0
    max_steps = len(BINARY_MODS) + len(TUNE_ORDER) + len(FUEL_ORDER) + len(FUELING_ORDER)

    for _ in range(max_steps):
        if current_whp >= target_whp:
            break

        candidates: list[dict] = []

        for mod in remaining_binary:
            test = {**config, mod: 1}
            whp, wtq = predict(test)
            gain = whp - current_whp
            if gain > 0:
                cost = _prices.get(mod, {}).get("cost_usd", 0)
                candidates.append({
                    "kind": "binary", "label": mod, "next_val": None,
                    "config": test, "whp": round(whp, 1), "wtq": round(wtq, 1),
                    "cost": cost, "hpd": gain / cost if cost > 0 else float("inf"),
                })

        next_tune = _next(TUNE_ORDER, current_tune)
        if next_tune:
            test = {**config, "tune": next_tune}
            whp, wtq = predict(test)
            gain = whp - current_whp
            if gain > 0:
                cost = _prices.get(f"tune_{next_tune}", {}).get("cost_usd", 150)
                candidates.append({
                    "kind": "tune", "label": f"tune → {next_tune}", "next_val": next_tune,
                    "config": test, "whp": round(whp, 1), "wtq": round(wtq, 1),
                    "cost": cost, "hpd": gain / cost if cost > 0 else float("inf"),
                })

        next_fuel = _next(FUEL_ORDER, current_fuel)
        if next_fuel:
            test = {**config, "fuel": next_fuel}
            whp, wtq = predict(test)
            gain = whp - current_whp
            if gain > 0:
                candidates.append({
                    "kind": "fuel", "label": f"fuel → {next_fuel}", "next_val": next_fuel,
                    "config": test, "whp": round(whp, 1), "wtq": round(wtq, 1),
                    "cost": 0, "hpd": float("inf"),
                })

        next_fueling = _next(FUELING_ORDER, current_fueling)
        if next_fueling:
            test = {**config, "fueling_hw": next_fueling}
            whp, wtq = predict(test)
            gain = whp - current_whp
            if gain > 0:
                cost = _prices.get(f"fueling_{next_fueling}", {}).get("cost_usd", 300)
                candidates.append({
                    "kind": "fueling", "label": f"fueling → {next_fueling}", "next_val": next_fueling,
                    "config": test, "whp": round(whp, 1), "wtq": round(wtq, 1),
                    "cost": cost, "hpd": gain / cost if cost > 0 else float("inf"),
                })

        if not candidates:
            break

        best = max(candidates, key=lambda c: c["hpd"])
        config = best["config"]
        current_whp = best["whp"]
        current_wtq = best["wtq"]
        total_cost += best["cost"]
        steps.append({
            "mod": best["label"],
            "cumulative_whp": current_whp,
            "cumulative_wtq": current_wtq,
            "cost_usd": best["cost"],
        })

        if best["kind"] == "binary":
            remaining_binary.remove(best["label"])
        elif best["kind"] == "tune":
            current_tune = best["next_val"]
        elif best["kind"] == "fuel":
            current_fuel = best["next_val"]
        elif best["kind"] == "fueling":
            current_fueling = best["next_val"]

    reachable = current_whp >= target_whp
    final_flags = evaluate_rules(config, current_whp)
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
