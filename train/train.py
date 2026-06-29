#!/usr/bin/env python3
"""
Train LightGBM whp/wtq regressors on dyno_data.csv.

Run from repo root:
    pip install -r train/requirements.txt
    python train/train.py

Outputs: model/whp_model.pkl  model/wtq_model.pkl
         model/encoders.pkl   model/metrics.json
"""

import csv
import json
import pickle
from pathlib import Path

import numpy as np
import lightgbm as lgb
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_error

REPO_ROOT = Path(__file__).parent.parent
DATA_PATH = REPO_ROOT / "data" / "dyno_data.csv"
MODEL_DIR = REPO_ROOT / "model"

# Ordinal progressions — higher index = more power potential
FUEL_ORDER    = ["91", "93", "e30", "e50", "e85"]
FUELING_ORDER = ["stock_hpfp", "upg_hpfp", "meth", "port_inj", "port_inj_meth"]
TUNE_ORDER    = [
    "stock", "jb4_s1", "mhd_s1", "jb4_s2", "mhd_s2",
    "mhd_s2plus", "mhd_custom", "cobb", "custom",
]
BINARY_MODS = [
    "downpipe", "charge_pipes", "intercooler",
    "intake", "catback", "bov_delete", "oil_cooler",
]

# Feature column order used for both training and inference
FEATURE_ORDER = [
    "chassis", "year", "turbo_setup",
    "fuel", "fueling_hw", "tune",
    *BINARY_MODS,
    "dyno_type",
]

# Monotonic constraints per feature (+1 = higher value → more power, 0 = unconstrained)
MONOTONE = [
    0,           # chassis      — unordered category
    0,           # year         — no strong monotone relationship
    0,           # turbo_setup  — only "stock" in MVP
    1,           # fuel         — higher ethanol → more power
    1,           # fueling_hw   — better hardware → more power
    1,           # tune         — higher stage → more power
    1, 1, 1, 1, 1, 1, 1,  # binary mods — installed → more power
    0,           # dyno_type    — correction factor, not power predictor
]


def load_data() -> list[dict]:
    rows = []
    with open(DATA_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("id", "").strip():
                rows.append(row)
    return rows


def build_encoders(rows: list[dict]) -> dict:
    """Build mapping dicts for all categorical columns."""
    chassis_vals = sorted(set(r["chassis"]     for r in rows))
    turbo_vals   = sorted(set(r["turbo_setup"] for r in rows))
    dyno_vals    = sorted(set(r["dyno_type"]   for r in rows))

    return {
        "chassis_map":   {v: i for i, v in enumerate(chassis_vals)},
        "turbo_map":     {v: i for i, v in enumerate(turbo_vals)},
        "dyno_map":      {v: i for i, v in enumerate(dyno_vals)},
        "fuel_map":      {v: i for i, v in enumerate(FUEL_ORDER)},
        "fueling_map":   {v: i for i, v in enumerate(FUELING_ORDER)},
        "tune_map":      {v: i for i, v in enumerate(TUNE_ORDER)},
        "feature_names": FEATURE_ORDER,
        "binary_mods":   BINARY_MODS,
        "fuel_order":    FUEL_ORDER,
        "fueling_order": FUELING_ORDER,
        "tune_order":    TUNE_ORDER,
    }


def encode_row(row: dict, encoders: dict) -> list[float]:
    def safe(mapping, val):
        return float(mapping.get(str(val).strip(), 0))

    return [
        safe(encoders["chassis_map"],  row.get("chassis", "e92")),
        float(row.get("year", 2010)),
        safe(encoders["turbo_map"],    row.get("turbo_setup", "stock")),
        safe(encoders["fuel_map"],     row.get("fuel", "93")),
        safe(encoders["fueling_map"],  row.get("fueling_hw", "stock_hpfp")),
        safe(encoders["tune_map"],     row.get("tune", "stock")),
        *[float(row.get(m, 0)) for m in BINARY_MODS],
        safe(encoders["dyno_map"],     row.get("dyno_type", "mustang")),
    ]


def main():
    MODEL_DIR.mkdir(exist_ok=True)

    rows = load_data()
    print(f"Loaded {len(rows)} rows from {DATA_PATH.name}")
    print(f"WARNING: {len(rows)} rows is a small dataset — treat CV metrics as noisy estimates.\n")

    encoders = build_encoders(rows)
    X      = np.array([encode_row(r, encoders) for r in rows], dtype=float)
    y_whp  = np.array([float(r["whp"]) for r in rows])
    y_wtq  = np.array([float(r["wtq"]) for r in rows])

    lgb_params = dict(
        n_estimators=100,
        learning_rate=0.05,
        num_leaves=8,           # small trees appropriate for tiny dataset
        min_child_samples=3,
        reg_alpha=0.1,
        reg_lambda=0.1,
        monotone_constraints=MONOTONE,
        monotone_constraints_method="advanced",
        verbosity=-1,
        random_state=42,
    )

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    whp_maes, wtq_maes = [], []
    bl_whp_maes, bl_wtq_maes = [], []

    for fold, (tr_idx, val_idx) in enumerate(kf.split(X), 1):
        X_tr, X_val     = X[tr_idx], X[val_idx]
        ywhp_tr, ywhp_val = y_whp[tr_idx], y_whp[val_idx]
        ywtq_tr, ywtq_val = y_wtq[tr_idx], y_wtq[val_idx]

        m_whp = lgb.LGBMRegressor(**lgb_params).fit(X_tr, ywhp_tr)
        m_wtq = lgb.LGBMRegressor(**lgb_params).fit(X_tr, ywtq_tr)

        whp_maes.append(mean_absolute_error(ywhp_val, m_whp.predict(X_val)))
        wtq_maes.append(mean_absolute_error(ywtq_val, m_wtq.predict(X_val)))
        bl_whp_maes.append(mean_absolute_error(ywhp_val, np.full_like(ywhp_val, ywhp_tr.mean())))
        bl_wtq_maes.append(mean_absolute_error(ywtq_val, np.full_like(ywtq_val, ywtq_tr.mean())))

        print(f"  Fold {fold}: whp MAE = {whp_maes[-1]:.1f}  wtq MAE = {wtq_maes[-1]:.1f}")

    print()
    print("── Cross-validated MAE (5-fold) ─────────────────────")
    print(f"  LightGBM  whp: {np.mean(whp_maes):.1f} ± {np.std(whp_maes):.1f}")
    print(f"  LightGBM  wtq: {np.mean(wtq_maes):.1f} ± {np.std(wtq_maes):.1f}")
    print(f"  Baseline  whp: {np.mean(bl_whp_maes):.1f}  (predict training mean)")
    print(f"  Baseline  wtq: {np.mean(bl_wtq_maes):.1f}  (predict training mean)")
    print("─────────────────────────────────────────────────────")

    # Train final model on all data
    print("\nTraining final model on full dataset...")
    final_whp = lgb.LGBMRegressor(**lgb_params).fit(X, y_whp)
    final_wtq = lgb.LGBMRegressor(**lgb_params).fit(X, y_wtq)

    with open(MODEL_DIR / "whp_model.pkl", "wb") as f:
        pickle.dump(final_whp, f)
    with open(MODEL_DIR / "wtq_model.pkl", "wb") as f:
        pickle.dump(final_wtq, f)
    with open(MODEL_DIR / "encoders.pkl", "wb") as f:
        pickle.dump(encoders, f)

    metrics = {
        "n_rows": len(rows),
        "cv_folds": 5,
        "lgbm_whp_mae_mean": round(float(np.mean(whp_maes)), 2),
        "lgbm_whp_mae_std":  round(float(np.std(whp_maes)), 2),
        "lgbm_wtq_mae_mean": round(float(np.mean(wtq_maes)), 2),
        "lgbm_wtq_mae_std":  round(float(np.std(wtq_maes)), 2),
        "baseline_whp_mae":  round(float(np.mean(bl_whp_maes)), 2),
        "baseline_wtq_mae":  round(float(np.mean(bl_wtq_maes)), 2),
    }
    with open(MODEL_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nSaved artifacts to model/")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
