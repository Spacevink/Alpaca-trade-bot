import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    stats: {
      total_pnl: 0,
      win_rate: 0,
      total_trades: 0,
      open_trades: 0,
      closed_trades: 0,
      total_cycles: 0,
      action_breakdown: {},
      nav: 100000,
    },
    decisions: [],
    trades: [],
    pnlHistory: [],
    creditHistory: [],
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
