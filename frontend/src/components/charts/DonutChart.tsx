export default function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto h-auto -rotate-90">
      <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="26" />
      {data.map((d) => {
        const fraction = d.value / total
        const dash = fraction * circumference
        const circle = (
          <circle
            key={d.label}
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth="26"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        )
        offset += dash
        return circle
      })}
    </svg>
  )
}
