# optimizer.py
import numpy as np
import pandas as pd
import yfinance as yf
import cvxpy as cp

TRADING_DAYS = 252
RIDGE_EPS = 1e-6

def fetch_returns(tickers: list[str], start: str, end: str) -> pd.DataFrame:
    raw = yf.download(tickers, start=start, end=end, auto_adjust=True)
    prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
    return prices.dropna(how="all").pct_change().dropna()

def optimize(tickers: list[str], target_vol: float, start: str, end: str):
    returns = fetch_returns(tickers, start, end)
    mu = returns.mean().values * TRADING_DAYS
    Sigma = returns.cov().values * TRADING_DAYS + RIDGE_EPS * np.eye(len(tickers))

    n = len(tickers)
    w = cp.Variable(n)
    base_constraints = [cp.sum(w) == 1, w >= 0]

    # Try with vol cap first
    constraints = base_constraints + [cp.quad_form(w, Sigma) <= target_vol ** 2]
    prob = cp.Problem(cp.Maximize(mu @ w), constraints)
    prob.solve(solver=cp.SCS)

    # If infeasible, fall back to max Sharpe without vol cap
    if w.value is None:
        prob = cp.Problem(cp.Maximize(mu @ w), base_constraints)
        prob.solve(solver=cp.SCS)

    if w.value is None:
        raise ValueError("Optimization failed completely")

    w_opt = np.clip(w.value, 0, None)
    w_opt /= w_opt.sum()

    ret = float(mu @ w_opt)
    vol = float(np.sqrt(w_opt.T @ Sigma @ w_opt))
    sharpe = ret / (vol + 1e-12)

    return {
        "tickers": tickers,
        "weights": {t: round(float(wt), 4) for t, wt in zip(tickers, w_opt)},
        "expected_annual_return": round(ret, 4),
        "expected_annual_vol": round(vol, 4),
        "sharpe_ratio": round(sharpe, 4)
    }


def efficient_frontier(tickers: list[str], start: str, end: str, n_points: int = 40):
    returns = fetch_returns(tickers, start, end)
    mu = returns.mean().values * TRADING_DAYS
    Sigma = returns.cov().values * TRADING_DAYS + RIDGE_EPS * np.eye(len(tickers))

    n = len(tickers)
    base_constraints = [cp.sum(cp.Variable(n)) == 1]

    # Find return bounds
    w_tmp = cp.Variable(n)
    prob_max = cp.Problem(cp.Maximize(mu @ w_tmp), [cp.sum(w_tmp) == 1, w_tmp >= 0])
    prob_max.solve(solver=cp.SCS)
    ret_max = float(mu @ w_tmp.value)
    ret_min = float(min(mu))

    targets = np.linspace(ret_min, ret_max, n_points)
    frontier = []

    for target in targets:
        w = cp.Variable(n)
        cons = [cp.sum(w) == 1, w >= 0, mu @ w >= target]
        prob = cp.Problem(cp.Minimize(cp.quad_form(w, Sigma)), cons)
        prob.solve(solver=cp.SCS)
        if w.value is None:
            continue
        w_opt = np.clip(w.value, 0, None)
        w_opt /= w_opt.sum()
        ret = float(mu @ w_opt)
        vol = float(np.sqrt(w_opt.T @ Sigma @ w_opt))
        frontier.append({"return": round(ret, 4), "vol": round(vol, 4)})

    return frontier