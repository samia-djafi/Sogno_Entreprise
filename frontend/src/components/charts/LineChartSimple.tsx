import { useTheme } from '../../context/ThemeContext'

export default function LineChartSimple({ data }: { data: { day: string; value: number }[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const width = 560
  const height = 200
  const padding = 28
  const max = 100
  const min = 0
  const stepX = (width - padding * 2) / (data.length - 1)

  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const y = height - padding - ((d.value - min) / (max - min)) * (height - padding * 2)
    return { x, y, ...d }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

  const gridLines = [0, 25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {gridLines.map((g) => {
        const y = height - padding - (g / 100) * (height - padding * 2)
        return (
          <g key={g}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={isDark ? '#1c2430' : '#e8e1d3'} strokeDasharray="3 4" />
            <text x={4} y={y + 4} fontSize="10" fill={isDark ? '#6b7480' : '#9a927e'}>
              {g}
            </text>
          </g>
        )
      })}
      <path d={areaPath} fill="#0f3d3d" opacity="0.12" />
      <path d={path} fill="none" stroke="#0f3d3d" strokeWidth="2.5" />
      {points.map((p) => (
        <circle key={p.day} cx={p.x} cy={p.y} r="3.5" fill="#0f3d3d" />
      ))}
      {points.map((p) => (
        <text key={`${p.day}-label`} x={p.x} y={height - 6} fontSize="10" textAnchor="middle" fill={isDark ? '#6b7480' : '#9a927e'}>
          {p.day}
        </text>
      ))}
    </svg>
  )
}
