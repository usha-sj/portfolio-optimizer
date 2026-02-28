# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from screener import screen_tickers
from optimizer import optimize, efficient_frontier
from analytics import get_benchmark_comparison, get_sector_breakdown

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RISK_VOL_MAP = {
    "low": 0.20,
    "medium": 0.30,
    "high": 0.50
}

class OptimizeRequest(BaseModel):
    universe: list[str]       # e.g. ["AAPL","MSFT","GOOGL","AMZN","NVDA","META"]
    n_stocks: int             # how many to pick
    risk: str                 # "low" | "medium" | "high"
    start: str = "2022-01-01"
    end: str = "2024-01-01"

@app.post("/optimize")
def run_optimizer(req: OptimizeRequest):
    if req.risk not in RISK_VOL_MAP:
        raise HTTPException(400, "risk must be low, medium, or high")
    if req.n_stocks < 2:
        raise HTTPException(400, "need at least 2 stocks")

    target_vol = RISK_VOL_MAP[req.risk]

    selected = screen_tickers(req.universe, req.n_stocks, req.start, req.end)
    result = optimize(selected, target_vol, req.start, req.end)

    weights_list = list(result["weights"].values())

    result["screened_from"] = req.universe
    result["frontier"] = efficient_frontier(selected, req.start, req.end)
    result["benchmark"] = get_benchmark_comparison(selected, weights_list, req.start, req.end)
    result["sectors"] = get_sector_breakdown(selected, weights_list)

    return result