'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Image as ImageIcon,
  Star,
  Zap,
  BarChart2,
  Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

// ─── Colors ──────────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#0bbfbf', '#5eeae4', '#0899a0', '#067a80']

// ─── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-4 py-3 shadow-lg">
      {label && <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">{label}</p>}
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-muted)] capitalize">{p.name}:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {typeof p.value === 'number' && p.name === 'tokens'
              ? p.value.toLocaleString()
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Custom Pie Label ───────────────────────────────────────────────────────────
function PieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  value,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  name: string
  value: number
}) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (value === 0) return null

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${value}`}
    </text>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-aqua-500" />
      </div>
    )
  }

  const STATS = [
    {
      label: 'Total Generations',
      value: data.stats.totalGenerations.toLocaleString(),
      change: 'Lifetime',
      positive: true,
      icon: Zap,
      color: 'from-aqua-500 to-aqua-700',
    },
    {
      label: 'Tokens Used',
      value: data.stats.totalTokens.toLocaleString(),
      change: 'Lifetime',
      positive: true,
      icon: TrendingUp,
      color: 'from-aqua-400 to-aqua-600',
    },
    {
      label: 'Images Created',
      value: data.stats.imagesCreated.toLocaleString(),
      change: 'Lifetime',
      positive: true,
      icon: ImageIcon,
      color: 'from-aqua-600 to-aqua-800',
    },
    {
      label: 'Documents Uploaded',
      value: data.stats.docsUploaded.toLocaleString(),
      change: 'Lifetime',
      positive: true,
      icon: Star,
      color: 'from-aqua-500 to-aqua-700',
    },
  ]

  // Calculate percentages for pie chart
  const totalPie = data.pieData.reduce((acc: number, curr: any) => acc + curr.value, 0)
  const pieDataWithPercentages = data.pieData.map((d: any) => ({
    ...d,
    percentage: totalPie > 0 ? Math.round((d.value / totalPie) * 100) : 0
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-aqua-500 to-aqua-700 flex items-center justify-center shadow-md">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl gradient-text">Analytics</h1>
            <p className="text-sm text-muted mt-0.5">
              Your real-time usage statistics and generation insights
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="stat-card hover-lift"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className={`badge text-[10px] ${
                    stat.positive ? 'badge-aqua' : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] font-['Inter']">
                {stat.value}
              </div>
              <div className="text-xs text-muted font-medium">{stat.label}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Area Chart — Generations per Day */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl text-[var(--text-primary)]">Generations Over Time</h2>
            <p className="text-xs text-muted mt-0.5">Last 7 days activity</p>
          </div>
          <span className="badge badge-aqua">This Week</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.areaData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGenerations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0bbfbf" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0bbfbf" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0899a0" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#0899a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,191,191,0.08)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              formatter={(value: string) => (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="generations"
              stroke="#0bbfbf"
              strokeWidth={2.5}
              fill="url(#gradGenerations)"
              dot={{ r: 4, fill: '#0bbfbf', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#0bbfbf', strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pie + Bar Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl text-[var(--text-primary)]">Generation Types</h2>
            <p className="text-xs text-muted mt-0.5">Distribution by output type</p>
          </div>
          <div className="flex flex-col items-center">
            {pieDataWithPercentages.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieDataWithPercentages}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    dataKey="percentage"
                    labelLine={false}
                    label={PieLabel as never}
                    strokeWidth={2}
                    stroke="white"
                  >
                    {pieDataWithPercentages.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Share']}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(232,221,208,0.6)',
                      background: 'rgba(255,255,255,0.92)',
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted">
                No generation data yet
              </div>
            )}
            
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              {pieDataWithPercentages.map((entry: any, i: number) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-sm">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-[var(--text-secondary)] capitalize">{entry.name}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl text-[var(--text-primary)]">Model Usage</h2>
            <p className="text-xs text-muted mt-0.5">Runs per AI model</p>
          </div>
          {data.barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.barData}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                barSize={28}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,191,191,0.08)" vertical={false} />
                <XAxis
                  dataKey="model"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="runs"
                  name="Runs"
                  fill="#0bbfbf"
                  radius={[6, 6, 0, 0]}
                >
                  {data.barData.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? '#0bbfbf' : i === 1 ? '#5eeae4' : '#0899a0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted">
              No model usage data yet
            </div>
          )}
          
          <div className="flex gap-3 mt-3 flex-wrap">
            {data.barData.map((item: any, i: number) => (
              <div key={item.model} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{
                    background: i === 0 ? '#0bbfbf' : i === 1 ? '#5eeae4' : '#0899a0',
                  }}
                />
                <span className="text-muted truncate max-w-[100px]">{item.model}</span>
                <span className="font-semibold text-[var(--text-primary)]">{item.runs}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Token Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl text-[var(--text-primary)]">Token Consumption</h2>
            <p className="text-xs text-muted mt-0.5">Daily token usage trend</p>
          </div>
          <span className="badge badge-beige">This Week</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.areaData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTokens2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0899a0" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0899a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,191,191,0.08)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v > 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke="#0899a0"
              strokeWidth={2.5}
              fill="url(#gradTokens2)"
              dot={{ r: 4, fill: '#0899a0', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#0899a0', strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
