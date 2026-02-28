# analytics.py
import yfinance as yf
import numpy as np
import pandas as pd

TRADING_DAYS = 252

SECTOR_MAP = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology",
    "NVDA": "Technology", "META": "Technology", "AMZN": "Consumer Discretionary",
    "TSLA": "Consumer Discretionary", "JPM": "Financials", "GS": "Financials",
    "JNJ": "Healthcare", "PFE": "Healthcare", "XOM": "Energy", "CVX": "Energy",
    "BRK-B": "Financials", "V": "Financials", "MA": "Financials",
    "UNH": "Healthcare", "HD": "Consumer Discretionary", "DIS": "Communication"
}

def get_benchmark_comparison(tickers: list[str], weights: list[float], start: str, end: str):
    all_tickers = tickers + ["SPY"]
    raw = yf.download(all_tickers, start=start, end=end, auto_adjust=True)
    prices = raw["Close"]
    returns = prices.pct_change().dropna()

    portfolio_returns = returns[tickers].dot(weights)
    spy_returns = returns["SPY"]

    portfolio_curve = (1 + portfolio_returns).cumprod()
    spy_curve = (1 + spy_returns).cumprod()

    port_annual_return = portfolio_returns.mean() * TRADING_DAYS
    port_vol = portfolio_returns.std() * np.sqrt(TRADING_DAYS)
    spy_annual_return = spy_returns.mean() * TRADING_DAYS
    spy_vol = spy_returns.std() * np.sqrt(TRADING_DAYS)

    return {
        "portfolio": {
            "annual_return": round(float(port_annual_return), 4),
            "annual_vol": round(float(port_vol), 4),
            "sharpe": round(float(port_annual_return / port_vol), 4),
            "final_value": round(float(portfolio_curve.iloc[-1]), 4)
        },
        "benchmark_spy": {
            "annual_return": round(float(spy_annual_return), 4),
            "annual_vol": round(float(spy_vol), 4),
            "sharpe": round(float(spy_annual_return / spy_vol), 4),
            "final_value": round(float(spy_curve.iloc[-1]), 4)
        },
        "dates": portfolio_curve.index.strftime("%Y-%m-%d").tolist(),
        "portfolio_curve": portfolio_curve.round(4).tolist(),
        "spy_curve": spy_curve.round(4).tolist()
    }

def get_sector_breakdown(tickers: list[str], weights: list[float]):
    sector_weights: dict[str, float] = {}
    for ticker, weight in zip(tickers, weights):
        sector = SECTOR_MAP.get(ticker, "Other")
        sector_weights[sector] = round(sector_weights.get(sector, 0) + weight, 4)
    return sector_weights