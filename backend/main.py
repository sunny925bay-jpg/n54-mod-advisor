from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="N54 Mod Advisor API", version="0.1.0")

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
    goal: str         # "power" | "value" | "reliability"


class ModRecommendation(BaseModel):
    mod: str
    predicted_whp_gain: float
    predicted_wtq_gain: float
    cost_usd: int
    hp_per_dollar: float
    reasoning: str


class RecommendResponse(BaseModel):
    current_whp: float
    current_wtq: float
    recommendations: List[ModRecommendation]


@app.get("/health")
def health():
    return {"status": "ok", "model": "stub"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    """Stub: hardcoded example until baseline lookup model is wired in."""
    return RecommendResponse(
        current_whp=278.0,
        current_wtq=312.0,
        recommendations=[
            ModRecommendation(
                mod="mhd_s2",
                predicted_whp_gain=68.0,
                predicted_wtq_gain=76.0,
                cost_usd=150,
                hp_per_dollar=0.45,
                reasoning="Stage 2 tune is the highest-leverage bolt-on once a downpipe is installed.",
            ),
            ModRecommendation(
                mod="downpipe",
                predicted_whp_gain=18.0,
                predicted_wtq_gain=24.0,
                cost_usd=380,
                hp_per_dollar=0.047,
                reasoning="Catless downpipe cuts exhaust backpressure and unlocks Stage 2 tune compatibility.",
            ),
            ModRecommendation(
                mod="intercooler",
                predicted_whp_gain=12.0,
                predicted_wtq_gain=14.0,
                cost_usd=450,
                hp_per_dollar=0.027,
                reasoning="FMIC reduces charge temps on sustained pulls; bigger gains in hot climates.",
            ),
        ],
    )
