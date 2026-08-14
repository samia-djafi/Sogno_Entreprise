import { useTheme } from '../../context/ThemeContext'

export default function BarChartHorizontal({ data }: { data: { dept: string; value: number }[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const max = 600
  const ticks = [0, 150, 300, 450, 600]

  return (
    <div>
      <div className="flex flex-col gap-4">
        {data.map((d) => (
          <div key={d.dept} className="flex items-center gap-3">
            <div className={`w-20 shrink-0 text-[12.5px] ${isDark ? 'text-[#c7cdd6]' : 'text-[#3a3628]'}`}>{d.dept}</div>
            <div className="h-6 flex-1 rounded-sm" style={{ background: isDark ? '#161c25' : '#f0ece1' }}>
              <div className="h-full rounded-sm bg-[#0f3d3d]" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between pl-[92px] text-[11px]" style={{ color: isDark ? '#6b7480' : '#9a927e' }}>
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}
