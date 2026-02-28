# screener.py
import pandas as pd
import yfinance as yf

TRADING_DAYS = 252

def screen_tickers(universe: list[str], n: int, start: str, end: str) -> list[str]:
    raw = yf.download(universe, start=start, end=end, auto_adjust=True)
    prices = raw["Close"] if hasattr(raw.columns, "levels") else raw
    returns = prices.pct_change().dropna()

    mu = returns.mean() * TRADING_DAYS
    sigma = returns.std() * (TRADING_DAYS ** 0.5)
    sharpe = mu / sigma

    # return top N by Sharpe
    return sharpe.nlargest(n).index.tolist()