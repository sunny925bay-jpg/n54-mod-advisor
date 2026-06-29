from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

import baseline

app = FastAPI(title="N54 Mod Advisor API", version="0.2.0")

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
    return {"status": "ok", "model": "baseline-lookup"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    current_whp, current_wtq = baseline.estimate_current(req.tune, req.fuel)
    recs = baseline.get_recommendations(
        fuel=req.fuel,
        fueling_hw=req.fueling_hw,
        tune=req.tune,
        installed_mods=set(req.mods),
        goal=req.goal,
    )
    return RecommendResponse(
        current_whp=current_whp,
        current_wtq=current_wtq,
        recommendations=[
            ModRecommendation(
                mod=r["mod"],
                predicted_whp_gain=r["predicted_whp_gain"],
                predicted_wtq_gain=r["predicted_wtq_gain"],
                cost_usd=r["cost_usd"],
                hp_per_dollar=r["hp_per_dollar"],
                reasoning=r["reasoning"],
            )
            for r in recs
        ],
    )
