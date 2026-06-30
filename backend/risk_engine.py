"""
Risk rule evaluator.
Loads rules from data/risk_rules.json at startup.
Call evaluate_rules(config, predicted_whp) → list of triggered flag dicts.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

with open(DATA_DIR / "risk_rules.json", encoding="utf-8") as _f:
    _rules: list[dict] = json.load(_f)

FUEL_ORDER    = ["91", "93", "e30", "e50", "e85"]
TUNE_ORDER    = ["stock", "jb4_s1", "mhd_s1", "jb4_s2", "mhd_s2",
                 "mhd_s2plus", "mhd_custom", "cobb", "custom"]
FUELING_ORDER = ["stock_hpfp", "upg_hpfp", "meth", "port_inj", "port_inj_meth"]

SEVERITY_WEIGHT = {"info": 0.5, "caution": 1.0, "warning": 2.0}


def _gte(order: list, a: str, b: str) -> bool:
    try:
        return order.index(a) >= order.index(b)
    except ValueError:
        return False


def evaluate_rules(config: dict, predicted_whp: float = 0.0) -> list[dict]:
    """Return list of triggered risk flags for this config."""
    triggered = []
    for rule in _rules:
        match = True
        for key, val in rule["when"].items():
            if key == "fuel_gte":
                match = _gte(FUEL_ORDER, config.get("fuel", "91"), val)
            elif key == "fuel_in":
                match = config.get("fuel") in val
            elif key == "fuel_not_in":
                match = config.get("fuel") not in val
            elif key == "fueling_hw_in":
                match = config.get("fueling_hw") in val
            elif key == "fueling_hw_not_in":
                match = config.get("fueling_hw") not in val
            elif key == "tune_gte":
                match = _gte(TUNE_ORDER, config.get("tune", "stock"), val)
            elif key == "tune_in":
                match = config.get("tune") in val
            elif key == "tune_not_in":
                match = config.get("tune") not in val
            elif key == "mod_absent":
                match = int(config.get(val, 0)) == 0
            elif key == "mod_present":
                match = int(config.get(val, 0)) == 1
            elif key == "predicted_whp_gte":
                match = predicted_whp >= val
            else:
                match = False
            if not match:
                break
        if match:
            triggered.append({
                "id": rule["id"],
                "severity": rule["severity"],
                "message": rule["message"],
            })
    return triggered


def compute_risk_score(flags: list[dict]) -> float:
    return sum(SEVERITY_WEIGHT.get(f["severity"], 1.0) for f in flags)
