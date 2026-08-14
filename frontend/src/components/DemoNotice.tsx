import { Info } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function DemoNotice() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`shrink-0 border-t px-6 py-3 ${
        isDark
          ? 'border-[#161c25] bg-[#0a0d12]'
          : 'border-[#e8e1d3] bg-[#f7f2e9]'
      }`}
    >
      <div className="flex items-start gap-2">
        <Info
          size={14}
          className={`mt-0.5 shrink-0 ${
            isDark ? 'text-[#7a8290]' : 'text-[#8a8270]'
          }`}
        />

        <p
          className={`text-[12px] leading-relaxed ${
            isDark ? 'text-[#7a8290]' : 'text-[#8a8270]'
          }`}
        >
          <span
            className={`font-semibold ${
              isDark ? 'text-[#c7cdd6]' : 'text-[#4a4536]'
            }`}
          >
            Demo Notice:
          </span>{' '}
          This is a demonstration project using a real Retrieval-Augmented
          Generation (RAG) implementation. However, Sogno Enterprise is a
          fictional company for demonstration purposes, and all company
          documents, internal policies, procedures, and other provided
          information are fictional and not real company data.
        </p>
      </div>
    </div>
  )
}