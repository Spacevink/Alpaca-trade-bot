import { NextResponse } from 'next/server'
export async function GET() {
  const now = new Date()
  const decisions = Array.from({ length: 40 }, (_, i) => {
    const d = new Date(now); d.setMinutes(d.getMinutes() - i * 32)
    const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT']
    const symbol = symbols[i % 4]
    const actions = ['NO_TRADE', 'NO_TRADE', 'NO_TRADE', 'OPEN_SPREAD', 'HOLD']
    const action = actions[i % actions.length]
    const rationales: Record<string, string> = {
      NO_TRADE: 'Net credit $0.54 below minimum threshold $1.00. Regime bullish, VIX 17.0, DTE 35 within range.',
      OPEN_SPREAD: `${symbol} above 20d SMA. DTE 38, short delta -0.24, credit $1.31 on $5 spread. All conditions met.`,
      HOLD: 'Existing position open. Monitoring for exit conditions.',
    }
    return {
      cycle_id: `cycle-${i}`, timestamp: d.toISOString(), symbol, action,
      action_taken: action, confidence: action === 'OPEN_SPREAD' ? 0.78 : 0.15 + Math.random() * 0.2,
      rationale: rationales[action] || rationales.NO_TRADE,
      risk_flags: action === 'NO_TRADE' && i % 5 === 0 ? ['insufficient_credit'] : [],
      validation_passed: true, validation_failures: [],
    }
  })
  const trades = [
    { trade_id: 'trade-001', symbol: 'SPY', expiration: '2026-06-05', short_strike: 680, long_strike: 675,
      qty: 1, net_credit: 1.31, max_profit: 131, max_loss: 369,
      entry_time: new Date(now.getTime() - 3*24*60*60*1000).toISOString(),
      exit_time: new Date(now.getTime() - 1*24*60*60*1000).toISOString(),
      realized_pnl: 65.50, close_reason: 'profit_target', status: 'closed' },
    { trade_id: 'trade-002', symbol: 'QQQ', expiration: '2026-06-05', short_strike: 470, long_strike: 465,
      qty: 1, net_credit: 1.15, max_profit: 115, max_loss: 385,
      entry_time: new Date(now.getTime() - 1*24*60*60*1000).toISOString(),
      exit_time: null, realized_pnl: null, close_reason: null, status: 'open' },
  ]
  const pnlHistory = Array.from({ length: 20 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (19 - i))
    const pnl = i === 0 ? 0 : i < 10 ? i * 8 - 20 : 65.5 + (i - 10) * 3
    return { date: d.toISOString().split('T')[0], pnl: Math.round(pnl * 100) / 100 }
  })
  return NextResponse.json({
    stats: { total_pnl: 65.50, win_rate: 100, total_trades: 2, open_trades: 1,
             closed_trades: 1, total_cycles: 40, action_breakdown: { NO_TRADE: 32, OPEN_SPREAD: 5, HOLD: 3 }, nav: 100065.50 },
    decisions, trades, pnlHistory,
    creditHistory: [{ symbol: 'SPY', credit: 1.31, date: '2026-04-28' }, { symbol: 'QQQ', credit: 1.15, date: '2026-04-30' }],
    settings: [
      { key: 'MAX_RISK_PCT', label: 'Max risk per trade', value: '0.01', type: 'percent', min: 0.001, max: 0.02, description: '% of NAV risked per trade' },
      { key: 'MAX_RISK_ABS_CAP', label: 'Risk cap ($)', value: '500', type: 'dollar', min: 50, max: 2000, description: 'Hard cap on max risk per trade' },
      { key: 'DAILY_LOSS_CAP_PCT', label: 'Daily loss cap', value: '0.02', type: 'percent', min: 0.005, max: 0.05, description: 'Stops trading for the day' },
      { key: 'MAX_TRADES_PER_DAY', label: 'Max trades / day', value: '2', type: 'int', min: 1, max: 5, description: 'Max new positions per day' },
      { key: 'VIX_CEILING', label: 'VIX ceiling', value: '35', type: 'float', min: 20, max: 80, description: 'No trading above this VIX' },
      { key: 'SPREAD_WIDTH_POINTS', label: 'Spread width (pts)', value: '5', type: 'float', min: 1, max: 10, description: 'Width of put spread' },
      { key: 'MIN_CREDIT_PCT_OF_WIDTH', label: 'Min credit %', value: '0.20', type: 'percent', min: 0.10, max: 0.50, description: 'Minimum credit as % of width' },
      { key: 'DTE_MIN', label: 'Min DTE', value: '30', type: 'int', min: 14, max: 60, description: 'Minimum days to expiration' },
      { key: 'DTE_MAX', label: 'Max DTE', value: '45', type: 'int', min: 14, max: 90, description: 'Maximum days to expiration' },
      { key: 'EARNINGS_EXCLUSION_DAYS', label: 'Earnings buffer (days)', value: '10', type: 'int', min: 5, max: 30, description: 'Block single names near earnings' },
    ]
  })
}
