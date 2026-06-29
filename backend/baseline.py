"""
Baseline recommendation engine: average-gain lookup from dyno_data.csv.
No ML — computes mean whp/wtq per mod category, diffs against user's current config.
Replaced by the LightGBM model in Phase 2 without changing the API contract.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"

# Ordinal progressions for categorical upgrades
TUNE_ORDER = [
    "stock", "jb4_s1", "mhd_s1", "jb4_s2", "mhd_s2",
    "mhd_s2plus", "mhd_custom", "cobb", "custom",
]
FUEL_ORDER = ["91", "93", "e30", "e50", "e85"]
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
    path = DATA_DIR / "dyno_data.csv"
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("id", "").strip():  # skip blank lines
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
    # Binary mod gains: avg(whp | mod=1) − avg(whp | mod=0)
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

    tune_avgs    = _avg_by_col(rows, "tune")
    fuel_avgs    = _avg_by_col(rows, "fuel")
    fueling_avgs = _avg_by_col(rows, "fueling_hw")
    return binary_gains, tune_avgs, fuel_avgs, fueling_avgs


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


def estimate_current(tune: str, fuel: str) -> tuple[float, float]:
    """Rough current whp/wtq from tune + fuel averages."""
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
) -> list[dict]:
    candidates = []

    # 1. Binary bolt-on mods
    for mod in BINARY_MODS:
        if mod in installed_mods or mod not in _binary_gains:
            continue
        whp_gain, wtq_gain = _binary_gains[mod]
        cost = _prices.get(mod, {}).get("cost_usd", 0)
        hp_per_dollar = round(whp_gain / cost, 4) if cost > 0 else 0.0
        candidates.append({
            "mod": mod,
            "predicted_whp_gain": whp_gain,
            "predicted_wtq_gain": wtq_gain,
            "cost_usd": cost,
            "hp_per_dollar": hp_per_dollar,
            "reasoning": EXPLANATIONS.get(mod, ""),
        })

    # 2. Tune upgrade
    next_tune = _next(TUNE_ORDER, tune)
    if next_tune and tune in _tune_avgs and next_tune in _tune_avgs:
        whp_gain = round(_tune_avgs[next_tune][0] - _tune_avgs[tune][0], 1)
        wtq_gain = round(_tune_avgs[next_tune][1] - _tune_avgs[tune][1], 1)
        if whp_gain > 0:
            cost = _prices.get(f"tune_{next_tune}", {}).get("cost_usd", 150)
            hp_per_dollar = round(whp_gain / cost, 4) if cost > 0 else 0.0
            candidates.append({
                "mod": f"tune → {next_tune}",
                "predicted_whp_gain": whp_gain,
                "predicted_wtq_gain": wtq_gain,
                "cost_usd": cost,
                "hp_per_dollar": hp_per_dollar,
                "reasoning": EXPLANATIONS["tune_upgrade"],
            })

    # 3. Fuel upgrade
    next_fuel = _next(FUEL_ORDER, fuel)
    if next_fuel and fuel in _fuel_avgs and next_fuel in _fuel_avgs:
        whp_gain = round(_fuel_avgs[next_fuel][0] - _fuel_avgs[fuel][0], 1)
        wtq_gain = round(_fuel_avgs[next_fuel][1] - _fuel_avgs[fuel][1], 1)
        if whp_gain > 0:
            candidates.append({
                "mod": f"fuel → {next_fuel}",
                "predicted_whp_gain": whp_gain,
                "predicted_wtq_gain": wtq_gain,
                "cost_usd": 0,
                "hp_per_dollar": 999.0,  # free — just a fill-up
                "reasoning": EXPLANATIONS["fuel_upgrade"],
            })

    # 4. Fueling hardware upgrade
    next_fueling = _next(FUELING_ORDER, fueling_hw)
    if next_fueling and fueling_hw in _fueling_avgs and next_fueling in _fueling_avgs:
        whp_gain = round(_fueling_avgs[next_fueling][0] - _fueling_avgs[fueling_hw][0], 1)
        wtq_gain = round(_fueling_avgs[next_fueling][1] - _fueling_avgs[fueling_hw][1], 1)
        if whp_gain > 0:
            cost = _prices.get(f"fueling_{next_fueling}", {}).get("cost_usd", 300)
            hp_per_dollar = round(whp_gain / cost, 4) if cost > 0 else 0.0
            candidates.append({
                "mod": f"fueling → {next_fueling}",
                "predicted_whp_gain": whp_gain,
                "predicted_wtq_gain": wtq_gain,
                "cost_usd": cost,
                "hp_per_dollar": hp_per_dollar,
                "reasoning": EXPLANATIONS["fueling_upgrade"],
            })

    # Sort
    if goal == "value":
        candidates.sort(key=lambda x: x["hp_per_dollar"], reverse=True)
    else:  # "power" or "reliability" (reliability weighting added with real model)
        candidates.sort(key=lambda x: x["predicted_whp_gain"], reverse=True)

    return candidates
