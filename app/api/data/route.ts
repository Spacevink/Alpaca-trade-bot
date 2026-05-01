import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://nmcxflctrosrvlhlhxln.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tY3hmbGN0cm9zcnZsaGxoeGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODUwNjksImV4cCI6MjA5MzE2MTA2OX0.NZJ2UVVLPeqAW2mjQ7KZW2yniJW7Bu7yPwgFultk1jk'

async function sb(table: string, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export async function GET() {
  const [decisions, trades] = await Promise.all([
    sb('decisions', 'order=timestamp.desc&limit=100'),
    sb('trades', 'order=created_at.desc'),
  ])

  const closed = trades.filter((t: any) => t.status === 'closed' && t.realized_pnl !== null)
  const wins = closed.filter((t: any) => t.realized_pnl > 0)
  const total_pnl = closed.reduce((s: number, t: any) => s + t.realized_pnl, 0)
  const win_rate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0

  const action_breakdown: Record<string, number> = {}
  for (const d of decisions) {
    action_breakdown[d.action_recommended] = (action_breakdown[d.action_recommended] || 0) + 1
  }

  // P&L history — group by date
  const pnlByDate: Record<string, number> = {}
  for (const t of closed) {
    const date = t.exit_timestamp?.split('T')[0]
    if (date) pnlByDate[date] = (pnlByDate[date] || 0) + t.realized_pnl
  }
  let cumulative = 0
  const pnlHistory = Object.entries(pnlByDate).sort().map(([date, pnl]) => {
    cumulative += pnl
    return { date, pnl: Math.round(cumulative * 100) / 100 }
  })

  const creditHistory = trades
    .filter((t: any) => t.net_credit_received > 0)
    .map((t: any) => ({ symbol: t.symbol, credit: t.net_credit_received, date: t.entry_timestamp?.split('T')[0] }))

  return NextResponse.json({
    stats: {
      total_pnl: Math.round(total_pnl * 100) / 100,
      win_rate,
      total_trades: trades.length,
      open_trades: trades.filter((t: any) => t.status === 'open').length,
      closed_trades: closed.length,
      total_cycles: decisions.length,
      action_breakdown,
      nav: 100000 + total_pnl,
    },
    decisions: decisions.map((d: any) => ({
      cycle_id: d.cycle_id,
      timestamp: d.timestamp,
      symbol: d.symbol,
      action: d.action_recommended,
      action_taken: d.action_taken,
      confidence: d.claude_confidence,
      rationale: d.claude_rationale,
      risk_flags: d.risk_flags || [],
      validation_passed: d.validation_passed,
      validation_failures: d.validation_failures || [],
    })),
    trades: trades.map((t: any) => ({
      trade_id: t.trade_id,
      symbol: t.symbol,
      expiration: t.expiration,
      short_strike: t.short_strike,
      long_strike: t.long_strike,
      qty: t.qty,
      net_credit: t.net_credit_received,
      max_profit: t.max_profit,
      max_loss: t.max_loss,
      entry_time: t.entry_timestamp,
      exit_time: t.exit_timestamp,
      realized_pnl: t.realized_pnl,
      close_reason: t.close_reason,
      status: t.status,
    })),
    pnlHistory,
    creditHistory,
    settings: [
      { key: "MAX_RISK_PCT", label: "Max risk per trade", value: "0.01", type: "percent", min: 0.001, max: 0.02, description: "% of NAV risked per trade" },
      { key: "MAX_RISK_ABS_CAP", label: "Risk cap ($)", value: "500", type: "dollar", min: 50, max: 2000, description: "Hard cap on max risk per trade" },
      { key: "DAILY_LOSS_CAP_PCT", label: "Daily loss cap", value: "0.02", type: "percent", min: 0.005, max: 0.05, description: "Stops trading for the day" },
      { key: "MAX_TRADES_PER_DAY", label: "Max trades / day", value: "2", type: "int", min: 1, max: 5, description: "Max new positions per day" },
      { key: "VIX_CEILING", label: "VIX ceiling", value: "35", type: "float", min: 20, max: 80, description: "No trading above this VIX" },
      { key: "SPREAD_WIDTH_POINTS", label: "Spread width (pts)", value: "5", type: "float", min: 1, max: 10, description: "Width of put spread" },
      { key: "MIN_CREDIT_PCT_OF_WIDTH", label: "Min credit %", value: "0.20", type: "percent", min: 0.10, max: 0.50, description: "Minimum credit as % of width" },
      { key: "DTE_MIN", label: "Min DTE", value: "30", type: "int", min: 14, max: 60, description: "Minimum days to expiration" },
      { key: "DTE_MAX", label: "Max DTE", value: "45", type: "int", min: 14, max: 90, description: "Maximum days to expiration" },
      { key: "EARNINGS_EXCLUSION_DAYS", label: "Earnings buffer (days)", value: "10", type: "int", min: 5, max: 30, description: "Block single names near earnings" },
    ]
  })
}
