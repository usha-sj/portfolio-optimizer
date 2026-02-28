import { useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";

const API = "http://127.0.0.1:8001";
const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"];

export default function App() {
  const [universe, setUniverse] = useState("AAPL,MSFT,GOOGL,NVDA,META,TSLA,JPM,AMZN");
  const [nStocks, setNStocks] = useState(4);
  const [risk, setRisk] = useState("medium");
  const [start, setStart] = useState("2022-01-01");
  const [end, setEnd] = useState("2024-01-01");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/optimize`, {
        universe: universe.split(",").map(t => t.trim().toUpperCase()),
        n_stocks: parseInt(nStocks),
        risk,
        start,
        end
      });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  const weightsData = result
    ? Object.entries(result.weights).map(([k, v]) => ({ ticker: k, weight: +(v * 100).toFixed(2) }))
    : [];

  const sectorData = result
    ? Object.entries(result.sectors).map(([k, v]) => ({ name: k, value: +(v * 100).toFixed(2) }))
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem" }}>Portfolio Optimizer</h1>
      <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>Mean-variance optimization with risk-adjusted screening</p>

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>STOCK UNIVERSE (comma separated)</label>
          <input value={universe} onChange={e => setUniverse(e.target.value)}
            style={{ width: "100%", padding: "0.6rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#f1f5f9", fontSize: "0.9rem" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>NUMBER OF STOCKS</label>
          <input type="number" min={2} max={10} value={nStocks} onChange={e => setNStocks(e.target.value)}
            style={{ width: "100%", padding: "0.6rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#f1f5f9", fontSize: "0.9rem" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>RISK TOLERANCE</label>
          <select value={risk} onChange={e => setRisk(e.target.value)}
            style={{ width: "100%", padding: "0.6rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#f1f5f9", fontSize: "0.9rem" }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>START DATE</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            style={{ width: "100%", padding: "0.6rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#f1f5f9", fontSize: "0.9rem" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>END DATE</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            style={{ width: "100%", padding: "0.6rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#f1f5f9", fontSize: "0.9rem" }} />
        </div>
      </div>

      <button onClick={run} disabled={loading}
        style={{ padding: "0.75rem 2rem", background: "#6366f1", border: "none", borderRadius: "8px", color: "white", fontSize: "1rem", fontWeight: 600, cursor: "pointer", marginBottom: "2rem" }}>
        {loading ? "Optimizing..." : "Optimize Portfolio"}
      </button>

      {error && <p style={{ color: "#f43f5e" }}>{error}</p>}

      {result && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Expected Return", value: (result.expected_annual_return * 100).toFixed(1) + "%" },
              { label: "Volatility", value: (result.expected_annual_vol * 100).toFixed(1) + "%" },
              { label: "Sharpe Ratio", value: result.sharpe_ratio.toFixed(2) },
              { label: "vs SPY Return", value: (result.benchmark.benchmark_spy.annual_return * 100).toFixed(1) + "%" },
              { label: "SPY Sharpe", value: result.benchmark.benchmark_spy.sharpe.toFixed(2) },
            ].map(c => (
              <div key={c.label} style={{ background: "#1e293b", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#6366f1" }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Weights + Sector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ background: "#1e293b", borderRadius: "10px", padding: "1.25rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#94a3b8" }}>OPTIMAL WEIGHTS</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weightsData}>
                  <XAxis dataKey="ticker" stroke="#64748b" />
                  <YAxis stroke="#64748b" unit="%" />
                  <Tooltip formatter={v => v + "%"} contentStyle={{ background: "#0f172a", border: "none" }} />
                  <Bar dataKey="weight" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#1e293b", borderRadius: "10px", padding: "1.25rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#94a3b8" }}>SECTOR ALLOCATION</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} ${value}%`}>
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => v + "%"} contentStyle={{ background: "#0f172a", border: "none" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Efficient Frontier */}
          <div style={{ background: "#1e293b", borderRadius: "10px", padding: "1.25rem", marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#94a3b8" }}>EFFICIENT FRONTIER</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="vol" name="Volatility" stroke="#64748b" tickFormatter={v => (v * 100).toFixed(0) + "%"} label={{ value: "Volatility", position: "insideBottom", offset: -5, fill: "#64748b" }} />
                <YAxis dataKey="return" name="Return" stroke="#64748b" tickFormatter={v => (v * 100).toFixed(0) + "%"} label={{ value: "Return", angle: -90, position: "insideLeft", fill: "#64748b" }} />
                <Tooltip formatter={v => (v * 100).toFixed(1) + "%"} contentStyle={{ background: "#0f172a", border: "none" }} />
                <Scatter data={result.frontier} fill="#22d3ee" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Benchmark Comparison */}
          <div style={{ background: "#1e293b", borderRadius: "10px", padding: "1.25rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#94a3b8" }}>PORTFOLIO vs S&P 500</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={result.benchmark.dates.map((d, i) => ({
                date: d,
                Portfolio: result.benchmark.portfolio_curve[i],
                SPY: result.benchmark.spy_curve[i]
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={false} />
                <YAxis stroke="#64748b" tickFormatter={v => "$" + v.toFixed(2)} />
                <Tooltip formatter={v => "$" + v.toFixed(2)} contentStyle={{ background: "#0f172a", border: "none" }} />
                <Legend />
                <Line type="monotone" dataKey="Portfolio" stroke="#6366f1" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="SPY" stroke="#22d3ee" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}