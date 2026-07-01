from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Use trained model if artifacts exist; fall back to avg-gain baseline otherwise.
try:
    import model_inference as recommender
    _MODEL_STATUS = "lgbm"
except FileNotFoundError:
    import baseline as recommender
    _MODEL_STATUS = "baseline-lookup"

_BINARY_MODS = [
    "downpipe", "charge_pipes", "intercooler",
    "intake", "catback", "bov_delete", "oil_cooler",
]

app = FastAPI(title="N54 Mod Advisor API", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to Vercel domain before prod
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendRequest(BaseModel):
    chassis: str      # "e90" | "e92" | "e93" | "e82" | "e88" | "e89" | "f10"
    year: int         # 2007–2013
    fuel: str         # "91" | "93" | "e30" | "e50" | "e85"
    fueling_hw: str   # "stock_hpfp" | "upg_hpfp" | "port_inj" | "meth" | "port_inj_meth"
    tune: str         # "stock" | "jb4_s1" | "mhd_s1" | "mhd_s2" | ... see data/schema.md
    mods: List[str]   # ["downpipe", "intercooler", "charge_pipes", ...]
    goal: str         # "max_power" | "best_value" | "reliability" | "target_hp"
    target_hp: Optional[int] = None


class PredictRequest(BaseModel):
    chassis: str
    year: int
    fuel: str
    fueling_hw: str
    tune: str
    mods: List[str]


class RiskFlag(BaseModel):
    id: str
    severity: str  # "info" | "caution" | "warning"
    message: str


class PartOption(BaseModel):
    brand: str
    name: str
    price_usd: int
    vendor_url: str
    pros: List[str]
    cons: List[str]


class ModRecommendation(BaseModel):
    mod: str
    predicted_whp_gain: float
    predicted_wtq_gain: float
    cost_usd: int
    hp_per_dollar: float
    reasoning: str
    explanation: str = ""
    parts: List[PartOption] = []
    risk_flags: List[RiskFlag] = []
    risk_score: float = 0.0


class BuildStep(BaseModel):
    mod: str
    cumulative_whp: float
    cumulative_wtq: float
    cost_usd: int


class BuildPlan(BaseModel):
    steps: List[BuildStep]
    final_whp: float
    final_wtq: float
    total_cost_usd: int
    risk_flags: List[RiskFlag]
    reachable: bool
    message: str


class RecommendResponse(BaseModel):
    current_whp: float
    current_wtq: float
    model: str
    recommendations: List[ModRecommendation]
    build_plan: Optional[BuildPlan] = None


class PredictResponse(BaseModel):
    whp: float
    wtq: float
    model: str


@app.get("/health")
def health():
    return {"status": "ok", "model": _MODEL_STATUS}


@app.post("/predict", response_model=PredictResponse)
def predict_build(req: PredictRequest):
    """Return predicted whp/wtq for a full build config."""
    config = {
        "chassis": req.chassis,
        "year": req.year,
        "turbo_setup": "stock",
        "fuel": req.fuel,
        "fueling_hw": req.fueling_hw,
        "tune": req.tune,
        "dyno_type": "mustang",
        **{m: (1 if m in req.mods else 0) for m in _BINARY_MODS},
    }
    whp, wtq = recommender.predict(config)
    return PredictResponse(whp=whp, wtq=wtq, model=_MODEL_STATUS)


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    """Return current predicted power + ranked mod recommendations."""
    current_whp, current_wtq = recommender.estimate_current(
        tune=req.tune,
        fuel=req.fuel,
        chassis=req.chassis,
        year=req.year,
        fueling_hw=req.fueling_hw,
        **{m: (1 if m in req.mods else 0) for m in _BINARY_MODS},
    )
    recs = recommender.get_recommendations(
        fuel=req.fuel,
        fueling_hw=req.fueling_hw,
        tune=req.tune,
        installed_mods=set(req.mods),
        goal=req.goal,
        chassis=req.chassis,
        year=req.year,
        target_hp=req.target_hp,
    )
    build_plan = None
    if req.goal == "target_hp" and req.target_hp is not None:
        plan = recommender.get_build_plan(
            fuel=req.fuel,
            fueling_hw=req.fueling_hw,
            tune=req.tune,
            installed_mods=set(req.mods),
            target_whp=req.target_hp,
            chassis=req.chassis,
            year=req.year,
        )
        build_plan = BuildPlan(**plan)

    return RecommendResponse(
        current_whp=current_whp,
        current_wtq=current_wtq,
        model=_MODEL_STATUS,
        recommendations=[ModRecommendation(**r) for r in recs],
        build_plan=build_plan,
    )
