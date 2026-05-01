'use client'
import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

interface Stats { total_pnl: number; win_rate: number; total_trades: number; open_trades: number; closed_trades: number; total_cycles: number; action_breakdown: Record<string, number>; nav: number }
interface Decision { cycle_id: string; timestamp: string; symbol: string; action: string; action_taken: string; confidence: number; rationale: string; risk_flags: string[]; validation_passed: boolean; validation_failures: string[] }
interface Trade { trade_id: string; symbol: string; expiration: string; short_strike: number; long_strike: number; qty: number; net_credit: number; max_profit: number; max_loss: number; entry_time: string | null; exit_time: string | null; realized_pnl: number | null; close_reason: string | null; status: string }
interface Setting { key: string; label: string; value: string; type: string; min: number; max: number; description: string }
interface DashboardData { stats: Stats; decisions: Decision[]; trades: Trade[]; pnlHistory: Array<{ date: string; pnl: number }>; creditHistory: Array<{ symbol: string; credit: number; date: string }>; settings: Setting[] }

const ACTION_COLORS: Record<string, string> = { OPEN_SPREAD: '#059669', CLOSE_POSITION: '#2563eb', HOLD: '#6b7280', NO_TRADE: '#9ca3af', BLOCKED: '#dc2626' }

function fmtTime(iso: string) { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function ActionBadge({ action }: { action: string }) {
  const c = ACTION_COLORS[action] || '#6b7280'
  return <span style={{ color: c, border: `1px solid ${c}33`, background: `${c}11` }} className="text-xs font-mono px-2 py-0.5 rounded-sm whitespace-nowrap">{action}</span>
}
function PnLTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return <div className="bg-white border border-gray-200 rounded px-3 py-2 text-xs shadow-sm"><div className="text-gray-400 mb-1">{label}</div><div className={`font-mono font-medium ${val >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{val >= 0 ? '+' : ''}${val.toFixed(2)}</div></div>
}
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return <div className="bg-white border border-gray-200 rounded p-4"><div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{label}</div><div className={`text-2xl font-mono font-bold ${accent || 'text-gray-900'}`}>{value}</div>{sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}</div>
}
type Tab = 'overview' | 'decisions' | 'trades' | 'settings'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [clock, setClock] = useState('')
  const [settingValues, setSettingValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const load = useCallback(async () => {
    const res = await fetch('/api/data'); const json = await res.json(); setData(json)
    const vals: Record<string, string> = {}; json.settings.forEach((s: Setting) => { vals[s.key] = s.value }); setSettingValues(vals)
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York' }) + ' ET')
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])
  const tabs: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'decisions', label: 'Decision log' }, { id: 'trades', label: 'Trades' }, { id: 'settings', label: 'Settings' }]
  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-mono">Loading...</div>
  const { stats, decisions, trades, pnlHistory, creditHistory, settings } = data
  const breakdownData = Object.entries(stats.action_breakdown).map(([action, count]) => ({ action, count }))
  const totalActions = breakdownData.reduce((a, b) => a + b.count, 0)
  const confBuckets = [
    { range: '0–20%', count: decisions.filter(d => d.confidence < 0.2).length },
    { range: '20–40%', count: decisions.filter(d => d.confidence >= 0.2 && d.confidence < 0.4).length },
    { range: '40–60%', count: decisions.filter(d => d.confidence >= 0.4 && d.confidence < 0.6).length },
    { range: '60–80%', count: decisions.filter(d => d.confidence >= 0.6 && d.confidence < 0.8).length },
    { range: '80%+', count: decisions.filter(d => d.confidence >= 0.8).length },
  ]
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
      <header className="bg-white border-b border-gray-200 px-6 h-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-sm font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'system-ui,sans-serif' }}>Options Agent</span><span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">PAPER</span></div>
        <div className="flex items-center gap-6 text-xs text-gray-400"><span>NAV ${stats.nav.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span><span className="font-mono">{clock}</span></div>
      </header>
      <nav className="bg-white border-b border-gray-200 px-6 flex sticky top-12 z-40">
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 text-xs border-b-2 transition-colors cursor-pointer ${tab === t.id ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`} style={{ fontFamily: 'system-ui,sans-serif' }}>{t.label}</button>)}
      </nav>
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total P&L" value={`${stats.total_pnl >= 0 ? '+' : ''}$${stats.total_pnl.toFixed(2)}`} sub={`${stats.closed_trades} closed trades`} accent={stats.total_pnl >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <StatCard label="Win rate" value={stats.closed_trades > 0 ? `${stats.win_rate}%` : '—'} sub={`${stats.closed_trades} trades closed`} />
              <StatCard label="Cycles run" value={stats.total_cycles.toString()} sub="evaluation cycles" />
              <StatCard label="Open positions" value={stats.open_trades.toString()} sub="max 1 in v1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 bg-white border border-gray-200 rounded p-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-4">Cumulative P&L</div>
                <ResponsiveContainer width="100%" height={180}><LineChart data={pnlHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}><XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} /><YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} /><Tooltip content={<PnLTooltip />} /><ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" /><Line dataKey="pnl" stroke="#059669" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#059669' }} /></LineChart></ResponsiveContainer>
              </div>
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-4">Claude decisions</div>
                <div className="space-y-3">{breakdownData.map(({ action, count }) => (<div key={action}><div className="flex justify-between items-center mb-1"><span className="text-xs text-gray-500">{action}</span><span className="text-xs font-mono text-gray-900">{count}</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${(count / totalActions) * 100}%`, background: ACTION_COLORS[action] }} /></div></div>))}</div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 font-mono">{totalActions} total decisions</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-4">Credit per trade ($)</div>
                <ResponsiveContainer width="100%" height={140}><BarChart data={creditHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}><XAxis dataKey="symbol" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} /><Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Credit']} contentStyle={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4 }} /><Bar dataKey="credit" radius={[2, 2, 0, 0]}>{creditHistory.map((_, i) => <Cell key={i} fill="#059669" opacity={0.75} />)}</Bar></BarChart></ResponsiveContainer>
              </div>
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-4">Confidence distribution</div>
                <ResponsiveContainer width="100%" height={140}><BarChart data={confBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}><XAxis dataKey="range" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4 }} /><Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#2563eb" opacity={0.65} /></BarChart></ResponsiveContainer>
              </div>
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Latest decisions</div>
                <div className="space-y-2.5">{decisions.slice(0, 6).map(d => (<div key={d.cycle_id} className="flex items-center gap-2"><span className="text-xs text-gray-400 font-mono w-12 shrink-0">{new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span><span className="text-xs font-semibold text-gray-700 w-10 shrink-0">{d.symbol}</span><ActionBadge action={d.action} /></div>))}</div>
              </div>
            </div>
          </div>
        )}
        {tab === 'decisions' && (
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"><span className="text-xs text-gray-400 uppercase tracking-widest">Decision log — {decisions.length} entries</span><button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-3 py-1 cursor-pointer">↻ Refresh</button></div>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{['Timestamp','Symbol','Action','Confidence','Validation','Rationale'].map(h => <th key={h} className="text-left px-4 py-2 text-gray-400 font-normal whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{decisions.map((d, i) => (<tr key={d.cycle_id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 ? 'bg-gray-50/30' : ''}`}><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap font-mono">{fmtTime(d.timestamp)}</td><td className="px-4 py-2.5 font-semibold">{d.symbol}</td><td className="px-4 py-2.5"><ActionBadge action={d.action} /></td><td className="px-4 py-2.5 font-mono"><span className={d.confidence > 0.6 ? 'text-emerald-600' : d.confidence > 0.3 ? 'text-amber-500' : 'text-gray-400'}>{(d.confidence * 100).toFixed(0)}%</span></td><td className="px-4 py-2.5">{d.validation_passed ? <span className="text-emerald-600 font-medium">PASS</span> : <div><span className="text-red-500 font-medium">FAIL</span>{d.validation_failures.map((f, j) => <div key={j} className="text-red-400 mt-0.5">{f}</div>)}</div>}</td><td className="px-4 py-2.5 text-gray-500 max-w-sm"><div className="line-clamp-2">{d.rationale}</div>{d.risk_flags.length > 0 && <div className="flex gap-1 mt-1 flex-wrap">{d.risk_flags.map(f => <span key={f} className="bg-red-50 text-red-400 border border-red-100 rounded px-1.5 py-0.5">{f}</span>)}</div>}</td></tr>))}</tbody></table></div>
          </div>
        )}
        {tab === 'trades' && (
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100"><span className="text-xs text-gray-400 uppercase tracking-widest">Trade journal — {trades.length} positions</span></div>
            {trades.length === 0 ? <div className="p-12 text-center text-gray-400 text-sm">No trades executed yet.</div> :
            <table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{['Symbol','Spread','Expiry','Qty','Credit','Max profit','Max loss','Status','P&L','Close reason'].map(h => <th key={h} className="text-left px-4 py-2 text-gray-400 font-normal whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{trades.map(t => (<tr key={t.trade_id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-4 py-3 font-semibold">{t.symbol}</td><td className="px-4 py-3 font-mono">{t.short_strike}/<span className="text-gray-400">{t.long_strike}</span>P</td><td className="px-4 py-3 text-gray-400 font-mono">{t.expiration}</td><td className="px-4 py-3">{t.qty}</td><td className="px-4 py-3 text-emerald-600 font-mono">${t.net_credit.toFixed(2)}</td><td className="px-4 py-3 text-emerald-600 font-mono">${t.max_profit.toFixed(0)}</td><td className="px-4 py-3 text-red-400 font-mono">${t.max_loss.toFixed(0)}</td><td className="px-4 py-3">{t.status === 'open' ? <span className="bg-blue-50 text-blue-600 border border-blue-100 rounded px-2 py-0.5 font-medium">OPEN</span> : <span className="bg-gray-100 text-gray-500 border border-gray-200 rounded px-2 py-0.5 font-medium">CLOSED</span>}</td><td className="px-4 py-3 font-mono">{t.realized_pnl !== null ? <span className={t.realized_pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}>{t.realized_pnl >= 0 ? '+' : ''}${t.realized_pnl.toFixed(2)}</span> : <span className="text-gray-300">—</span>}</td><td className="px-4 py-3 text-gray-400">{t.close_reason || '—'}</td></tr>))}</tbody></table>}
          </div>
        )}
        {tab === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 text-xs text-amber-700"><strong>Changes take effect on next restart.</strong> Stop the agent (Ctrl+C) and run <code className="bg-amber-100 px-1 rounded">python main.py</code>.</div>
            <div className="bg-white border border-gray-200 rounded overflow-hidden"><div className="px-4 py-3 border-b border-gray-100"><span className="text-xs text-gray-400 uppercase tracking-widest">Risk & strategy parameters</span></div>
            <div className="divide-y divide-gray-50">{settings.map(s => { const displayVal = s.type === 'percent' && settingValues[s.key] ? (parseFloat(settingValues[s.key]) * 100).toFixed(2) : settingValues[s.key] ?? s.value; return (<div key={s.key} className="px-4 py-3 flex items-center justify-between gap-4"><div className="flex-1"><div className="text-sm text-gray-800 font-medium mb-0.5" style={{ fontFamily: 'system-ui,sans-serif' }}>{s.label}</div><div className="text-xs text-gray-400">{s.description}</div></div><div className="flex items-center gap-2 shrink-0">{s.type === 'dollar' && <span className="text-xs text-gray-400">$</span>}<input type="number" value={displayVal} step={s.type === 'percent' ? '0.01' : s.type === 'int' ? '1' : '0.5'} min={s.type === 'percent' ? s.min * 100 : s.min} max={s.type === 'percent' ? s.max * 100 : s.max} onChange={e => { let val = e.target.value; if (s.type === 'percent') val = String(parseFloat(val) / 100); setSettingValues(prev => ({ ...prev, [s.key]: val })) }} className="w-24 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono text-right focus:outline-none focus:border-gray-400 bg-gray-50" />{s.type === 'percent' && <span className="text-xs text-gray-400">%</span>}</div></div>) })}</div></div>
            <div className="flex items-center gap-3"><button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }} className="bg-gray-900 text-white text-xs px-5 py-2.5 rounded hover:bg-gray-700 transition-colors cursor-pointer" style={{ fontFamily: 'system-ui,sans-serif' }}>Save configuration</button>{saved && <span className="text-xs text-emerald-600">✓ Saved — restart agent to apply</span>}</div>
          </div>
        )}
      </main>
    </div>
  )
}
