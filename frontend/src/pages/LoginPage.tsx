import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  ArrowRight,
  User,
  Briefcase,
  Info,
  Copy,
  Check,
  Share2,
  FileText,
  ShieldCheck,
  FlaskConical,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldQuestion,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const demoCredentials = {
  employee: { email: 'mira.djafi@sogno-enterprise.com', password: 'demopassword' },
  manager: { email: 'samy.djafi@sogno-enterprise.com', password: 'demopassword' },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [role, setRole] = useState<'employee' | 'manager'>('employee')
  const [email, setEmail] = useState(demoCredentials.employee.email)
  const [password, setPassword] = useState(demoCredentials.employee.password)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'employee' | 'manager' | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleRoleChange = (nextRole: 'employee' | 'manager') => {
    setRole(nextRole)
    setEmail(demoCredentials[nextRole].email)
    setPassword(demoCredentials[nextRole].password)
  }

  const handleCopy = (targetRole: 'employee' | 'manager') => {
    const creds = demoCredentials[targetRole]
    void navigator.clipboard.writeText(`${creds.email} / ${creds.password}`)
    setCopied(targetRole)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleSignIn = async () => {
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError)
      setSubmitting(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-dark text-text-dark-primary">
      {/* Left panel */}
      <div className="hidden h-screen w-1/2 flex-col justify-center px-8 py-6 lg:flex xl:px-10">
        <div>
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1a2028] text-accent">
              <Building2 size={16} />
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold">Sogno Enterprise</div>
              <div className="text-[10px] tracking-wide text-text-dark-muted">KNOWLEDGE &amp; DOCUMENT INTELLIGENCE</div>
            </div>
          </div>

          <h1 className="max-w-xl text-[32px] font-semibold leading-[1.15] text-text-dark-primary">
            Your company&apos;s knowledge, answerable in{' '}
            <span className="text-accent">one question.</span>
          </h1>
          <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-text-dark-secondary">
            Sogno Enterprise uses Retrieval-Augmented Generation (RAG) to search internal company documents and
            provide grounded answers with citations to the relevant source document and page.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-text-dark-secondary">
            <span className="flex items-center gap-1.5">
              <Share2 size={13} className="text-accent" />
              RAG Architecture
            </span>
            <span className="text-border-dark">|</span>
            <span className="flex items-center gap-1.5">
              <FileText size={13} className="text-accent" />
              Source Citations
            </span>
            <span className="text-border-dark">|</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-accent" />
              Document-Grounded AI
            </span>
          </div>

          {/* Try the demo */}
          <div className="mt-5 max-w-xl rounded-lg border border-border-dark bg-card-dark p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-accent">
              <FlaskConical size={13} />
              TRY THE DEMO
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-text-dark-secondary">
              Use either account below to explore the product.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {(['employee', 'manager'] as const).map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-between gap-3 rounded-md border border-border-dark bg-input-dark px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c2430] text-text-dark-secondary">
                      <User size={15} />
                    </div>
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-accent">
                        {r === 'employee' ? 'Employee View' : 'Manager View'}
                      </div>
                      <div className="mt-0.5 text-[12px] text-text-dark-primary">{demoCredentials[r].email}</div>
                      <div className="text-[11.5px] text-text-dark-muted">{demoCredentials[r].password}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(r)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-border-dark px-2 py-1.5 text-[11px] font-medium text-text-dark-secondary transition-colors hover:bg-card-dark-hover"
                  >
                    {copied === r ? <Check size={13} /> : <Copy size={13} />}
                    {copied === r ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer notice */}
          <div className="mt-4 flex max-w-xl items-center justify-between gap-4 rounded-lg border border-border-dark bg-card-dark px-4 py-3">
            <div className="flex items-center gap-2.5">
              <ShieldQuestion size={16} className="shrink-0 text-text-dark-secondary" />
              <div>
                <div className="text-[12.5px] font-semibold text-text-dark-primary">This is a demo environment.</div>
                <div className="text-[12.5px] font-semibold text-text-dark-primary">Sogno Enterprise is a fictional company created for demonstration purposes. The company policies, documents, and internal information used in this application are entirely fictional. The RAG implementation itself is real and fully functional.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex h-screen w-full items-center justify-center bg-bg-light px-6 py-6 lg:w-1/2 lg:shrink-0">
        <div className="flex w-full max-w-[460px] flex-col items-center rounded-2xl border border-border-light bg-card-light p-10 shadow-sm">          <h2 className="text-[22px] font-semibold text-sidebar-light">Welcome back</h2>
          <p className="mt-2 max-w-[300px] text-center text-[13.5px] leading-relaxed text-text-light-secondary">
            Sign in to continue and explore your company&apos;s knowledge base.
          </p>

          <div className="mt-6 grid w-full grid-cols-2 gap-2">
            <button
              onClick={() => handleRoleChange('employee')}
              disabled={submitting}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-colors disabled:opacity-50 ${
                role === 'employee'
                  ? 'border-sidebar-light bg-sidebar-light text-white'
                  : 'border-border-light bg-card-light text-text-light-primary hover:bg-bg-light'
              }`}
            >
              <User size={16} className={role === 'employee' ? 'text-accent' : 'text-text-light-secondary'} />
              <div className="text-center leading-tight">
                <div className="text-[12.5px] font-semibold">Employee</div>
                <div className={`text-[10.5px] ${role === 'employee' ? 'text-white/60' : 'text-text-light-secondary'}`}>
                  General access
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleChange('manager')}
              disabled={submitting}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-colors disabled:opacity-50 ${
                role === 'manager'
                  ? 'border-sidebar-light bg-sidebar-light text-white'
                  : 'border-border-light bg-card-light text-text-light-primary hover:bg-bg-light'
              }`}
            >
              <Briefcase size={16} className={role === 'manager' ? 'text-accent' : 'text-text-light-secondary'} />
              <div className="text-center leading-tight">
                <div className="text-[12.5px] font-semibold">Manager</div>
                <div className={`text-[10.5px] ${role === 'manager' ? 'text-white/60' : 'text-text-light-secondary'}`}>
                  Management access
                </div>
              </div>
            </button>
          </div>

          <div className="mt-5 w-full">
            <label className="mb-1.5 block text-[13px] font-medium text-text-light-primary">Work email</label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                placeholder="you@company.com"
                className="w-full rounded-md border border-border-light bg-input-light py-2.5 pl-9 pr-3 text-[13.5px] text-text-light-primary outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="mt-3 w-full">
            <label className="mb-1.5 block text-[13px] font-medium text-text-light-primary">Password</label>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                placeholder="Enter your password"
                className="w-full rounded-md border border-border-light bg-input-light py-2.5 pl-9 pr-9 text-[13.5px] text-text-light-primary outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light-secondary hover:text-text-light-primary"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex w-full items-center justify-between">
            <label className="flex items-center gap-2 text-[12.5px] text-text-light-secondary">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-light accent-accent"
              />
              Remember me
            </label>
            <button type="button" className="text-[12.5px] font-medium text-accent-dark hover:text-accent">
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="mt-4 w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={() => void handleSignIn()}
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-[14px] font-semibold text-[#1a1207] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={16} />
          </button>

          <div className="mt-5 flex items-center gap-1.5 text-[11px] text-text-light-secondary">
            <Info size={12} />
            Sogno Enterprise is a fictional demo company.
          </div>
        </div>
      </div>
    </div>
  )
}