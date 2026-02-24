'use client'

import { useState, useEffect, useCallback } from 'react'
import { gateway, gatewayRequest, type GatewayService, type GatewayInfo } from '@/lib/gateway'
import {
  HiOutlineServer,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineBeaker,
  HiOutlineClipboard,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCodeBracket,
  HiOutlineGlobeAlt,
  HiOutlineBolt,
  HiOutlinePaperAirplane,
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineMicrophone,
  HiOutlineCalendar,
} from 'react-icons/hi2'

// ─── Types ───────────────────────────────────────────────────────────────

interface ServiceConfig {
  key: GatewayService
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}

interface LogEntry {
  id: string
  timestamp: string
  method: string
  service: GatewayService
  path: string
  status: number
  duration: number
  ok: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────

const SERVICES: ServiceConfig[] = [
  {
    key: 'agent',
    label: 'Agent',
    description: 'AI inference, async tasks, file uploads',
    icon: <HiOutlineBolt className="w-5 h-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    key: 'rag',
    label: 'RAG',
    description: 'Knowledge base, document training',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    key: 'scheduler',
    label: 'Scheduler',
    description: 'Cron jobs, triggers, execution logs',
    icon: <HiOutlineCalendar className="w-5 h-5" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  {
    key: 'voice',
    label: 'Voice',
    description: 'Voice sessions, WebSocket setup',
    icon: <HiOutlineMicrophone className="w-5 h-5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
}

// ─── Page Component ─────────────────────────────────────────────────────

export default function GatewayDashboard() {
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState<string | null>(null)

  // Test console state
  const [method, setMethod] = useState<string>('GET')
  const [service, setService] = useState<GatewayService>('agent')
  const [path, setPath] = useState('')
  const [body, setBody] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<number | null>(null)
  const [testDuration, setTestDuration] = useState<number | null>(null)

  // Request log
  const [logs, setLogs] = useState<LogEntry[]>([])

  // Clipboard
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ─── Fetch gateway info ─────────────────────────────────────────────
  const fetchInfo = useCallback(async () => {
    setInfoLoading(true)
    setInfoError(null)
    try {
      const info = await gateway.info()
      setGatewayInfo(info)
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Failed to fetch gateway info')
    } finally {
      setInfoLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  // ─── Test console ───────────────────────────────────────────────────
  const handleTest = async () => {
    if (!path.trim()) return
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)
    setTestStatus(null)
    setTestDuration(null)

    const start = performance.now()
    try {
      let parsedBody: Record<string, any> | undefined
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        try {
          parsedBody = JSON.parse(body)
        } catch {
          setTestError('Invalid JSON body')
          setTestLoading(false)
          return
        }
      }

      const result = await gatewayRequest(service, path, {
        method: method as any,
        body: parsedBody,
      })

      const duration = Math.round(performance.now() - start)
      setTestResult(result.data)
      setTestStatus(result.status)
      setTestDuration(duration)

      const entry: LogEntry = {
        id: crypto.randomUUID?.() || String(Date.now()),
        timestamp: new Date().toISOString(),
        method,
        service,
        path: path.trim(),
        status: result.status,
        duration,
        ok: result.ok,
      }
      setLogs(prev => [entry, ...prev].slice(0, 50))
    } catch (err) {
      const duration = Math.round(performance.now() - start)
      setTestDuration(duration)
      setTestError(err instanceof Error ? err.message : 'Network error')

      const entry: LogEntry = {
        id: crypto.randomUUID?.() || String(Date.now()),
        timestamp: new Date().toISOString(),
        method,
        service,
        path: path.trim(),
        status: 0,
        duration,
        ok: false,
      }
      setLogs(prev => [entry, ...prev].slice(0, 50))
    } finally {
      setTestLoading(false)
    }
  }

  // ─── Copy to clipboard ─────────────────────────────────────────────
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <HiOutlineServer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Lyzr API Gateway</h1>
              <p className="text-xs text-gray-500">Unified proxy with built-in authentication</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {gatewayInfo && (
              <StatusBadge
                operational={gatewayInfo.status === 'operational'}
              />
            )}
            <button
              onClick={fetchInfo}
              className="p-2 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-900 transition-colors"
              title="Refresh"
            >
              <HiOutlineArrowPath className={`w-4 h-4 text-gray-400 ${infoLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error state */}
        {infoError && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 text-red-400">
              <HiOutlineXCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{infoError}</span>
            </div>
          </div>
        )}

        {/* Gateway Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={<HiOutlineShieldCheck className="w-5 h-5" />}
            label="Security"
            value="API Key Server-Side"
            sublabel="Never exposed to client"
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
          />
          <InfoCard
            icon={<HiOutlineKey className="w-5 h-5" />}
            label="API Key"
            value={gatewayInfo?.api_key_preview || (infoLoading ? '...' : 'Not set')}
            sublabel={gatewayInfo?.api_key_configured ? 'Configured' : 'Missing'}
            color={gatewayInfo?.api_key_configured ? 'text-blue-400' : 'text-red-400'}
            bgColor={gatewayInfo?.api_key_configured ? 'bg-blue-500/10' : 'bg-red-500/10'}
          />
          <InfoCard
            icon={<HiOutlineGlobeAlt className="w-5 h-5" />}
            label="Services"
            value={`${SERVICES.length} Connected`}
            sublabel="Agent, RAG, Scheduler, Voice"
            color="text-indigo-400"
            bgColor="bg-indigo-500/10"
          />
        </div>

        {/* Services Grid */}
        <section>
          <SectionHeader
            icon={<HiOutlineServer className="w-5 h-5" />}
            title="Service Routing"
            subtitle="All requests proxied with x-api-key injected server-side"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {SERVICES.map((svc) => (
              <ServiceCard
                key={svc.key}
                config={svc}
                info={gatewayInfo?.services[svc.key]}
                onCopy={copyToClipboard}
                copiedId={copiedId}
              />
            ))}
          </div>
        </section>

        {/* Test Console */}
        <section>
          <SectionHeader
            icon={<HiOutlineBeaker className="w-5 h-5" />}
            title="Test Console"
            subtitle="Send requests through the gateway to verify routing"
          />
          <div className="mt-4 rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden">
            {/* Input Bar */}
            <div className="p-4 border-b border-gray-800/60">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Method selector */}
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 sm:w-28"
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Service selector */}
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value as GatewayService)}
                  className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 sm:w-32"
                >
                  {SERVICES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>

                {/* Path input */}
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder={`Enter path (e.g. inference/chat/task)`}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTest() }}
                  />
                  <button
                    onClick={handleTest}
                    disabled={testLoading || !path.trim()}
                    className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    {testLoading ? (
                      <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                    ) : (
                      <HiOutlinePaperAirplane className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </div>

              {/* Hint */}
              <p className="mt-2 text-xs text-gray-600 font-mono">
                /api/gateway/{service}/{path || '...'}
              </p>

              {/* Body input (for POST/PUT/PATCH) */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 font-medium mb-1.5 block">Request Body (JSON)</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"message": "Hello", "agent_id": "..."}'
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 resize-y"
                  />
                </div>
              )}
            </div>

            {/* Response */}
            {(testResult || testError) && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">Response</span>
                    {testStatus !== null && (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono border ${
                        testStatus >= 200 && testStatus < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : testStatus >= 400
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {testStatus >= 200 && testStatus < 300 ? (
                          <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <HiOutlineXCircle className="w-3.5 h-3.5" />
                        )}
                        {testStatus}
                      </span>
                    )}
                    {testDuration !== null && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <HiOutlineClock className="w-3.5 h-3.5" />
                        {testDuration}ms
                      </span>
                    )}
                  </div>
                  {testResult && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(testResult, null, 2), 'response')}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      {copiedId === 'response' ? (
                        <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <HiOutlineClipboard className="w-3.5 h-3.5" />
                      )}
                      {copiedId === 'response' ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <pre className="p-4 rounded-lg bg-gray-950 border border-gray-800/60 text-xs font-mono text-gray-300 overflow-auto max-h-96 leading-relaxed">
                  {testError ? (
                    <span className="text-red-400">{testError}</span>
                  ) : (
                    JSON.stringify(testResult, null, 2)
                  )}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Request Log */}
        {logs.length > 0 && (
          <section>
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={<HiOutlineClock className="w-5 h-5" />}
                title="Request Log"
                subtitle={`${logs.length} recent requests`}
              />
              <button
                onClick={() => setLogs([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-900 border border-transparent hover:border-gray-800 transition-colors"
              >
                <HiOutlineTrash className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-gray-800/80 bg-gray-900/50 divide-y divide-gray-800/40 overflow-hidden">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${METHOD_COLORS[log.method] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                    {log.method}
                  </span>
                  <span className={`text-xs font-medium ${SERVICES.find(s => s.key === log.service)?.color || 'text-gray-400'}`}>
                    {log.service}
                  </span>
                  <span className="text-sm font-mono text-gray-400 truncate flex-1">/{log.path}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-mono ${
                    log.ok ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {log.ok ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> : <HiOutlineXCircle className="w-3.5 h-3.5" />}
                    {log.status || 'ERR'}
                  </span>
                  <span className="text-xs text-gray-600 font-mono w-16 text-right">{log.duration}ms</span>
                  <span className="text-xs text-gray-600 hidden sm:block">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Usage Guide */}
        <section>
          <SectionHeader
            icon={<HiOutlineCodeBracket className="w-5 h-5" />}
            title="Usage"
            subtitle="How to use the gateway from your code"
          />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CodeBlock
              title="Client-side (TypeScript)"
              code={`import { gateway } from '@/lib/gateway'

// Agent: submit task
const result = await gateway.agent.post(
  'inference/chat/task',
  { message: 'Hello!', agent_id: 'abc123' }
)

// RAG: list documents
const docs = await gateway.rag.get(
  'rag/documents/my-rag-id/'
)

// Scheduler: create schedule
const sched = await gateway.scheduler.post(
  'schedules/',
  {
    agent_id: 'abc123',
    cron_expression: '0 9 * * 1',
    message: 'Weekly report',
    user_id: 'your-api-key'
  }
)`}
              onCopy={() => copyToClipboard(`import { gateway } from '@/lib/gateway'\n\nconst result = await gateway.agent.post(\n  'inference/chat/task',\n  { message: 'Hello!', agent_id: 'abc123' }\n)`, 'code-client')}
              copiedId={copiedId}
              copyId="code-client"
            />
            <CodeBlock
              title="Direct HTTP (curl)"
              code={`# No API key needed -- gateway injects it

# Submit agent task
curl -X POST /api/gateway/agent/inference/chat/task \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello","agent_id":"abc123"}'

# Poll task result
curl /api/gateway/agent/inference/chat/task/{task_id}

# List RAG documents
curl /api/gateway/rag/rag/documents/{rag_id}/

# Upload to RAG
curl -X POST "/api/gateway/rag/train/pdf/?rag_id=xxx" \\
  -F "file=@doc.pdf"`}
              onCopy={() => copyToClipboard('curl -X POST /api/gateway/agent/inference/chat/task \\\n  -H "Content-Type: application/json" \\\n  -d \'{"message":"Hello","agent_id":"abc123"}\'', 'code-curl')}
              copiedId={copiedId}
              copyId="code-curl"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-600">
          <span>Lyzr API Gateway v1.0.0</span>
          <span className="flex items-center gap-1.5">
            <HiOutlineShieldCheck className="w-3.5 h-3.5" />
            API key never leaves the server
          </span>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatusBadge({ operational }: { operational: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      operational
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${operational ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {operational ? 'Operational' : 'Misconfigured'}
    </span>
  )
}

function InfoCard({
  icon,
  label,
  value,
  sublabel,
  color,
  bgColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  color: string
  bgColor: string
}) {
  return (
    <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white font-mono">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

function ServiceCard({
  config,
  info,
  onCopy,
  copiedId,
}: {
  config: ServiceConfig
  info?: { proxy_path: string; upstream: string; description: string; examples: string[] }
  onCopy: (text: string, id: string) => void
  copiedId: string | null
}) {
  const proxyPath = info?.proxy_path || `/api/gateway/${config.key}/{path}`

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5 transition-all hover:border-gray-600`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gray-900/60 flex items-center justify-center ${config.color}`}>
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{config.label}</h3>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Proxy path */}
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-gray-400 bg-gray-950/60 px-3 py-1.5 rounded-md border border-gray-800/40 truncate">
          {proxyPath}
        </code>
        <button
          onClick={() => onCopy(proxyPath, `svc-${config.key}`)}
          className="p-1.5 rounded-md hover:bg-gray-800/60 transition-colors"
          title="Copy path"
        >
          {copiedId === `svc-${config.key}` ? (
            <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <HiOutlineClipboard className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Upstream */}
      {info?.upstream && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <HiOutlineChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono truncate">{info.upstream}</span>
        </div>
      )}

      {/* Examples */}
      {info?.examples && info.examples.length > 0 && (
        <div className="mt-3 space-y-1">
          {info.examples.slice(0, 3).map((ex, i) => {
            const parts = ex.trim().split(/\s+/)
            const exMethod = parts[0]
            const exPath = parts.slice(1).join(' ')
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${METHOD_COLORS[exMethod] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                  {exMethod}
                </span>
                <span className="font-mono text-gray-500 truncate">{exPath}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CodeBlock({
  title,
  code,
  onCopy,
  copiedId,
  copyId,
}: {
  title: string
  code: string
  onCopy: () => void
  copiedId: string | null
  copyId: string
}) {
  return (
    <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <HiOutlineCodeBracket className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-400">{title}</span>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
        >
          {copiedId === copyId ? (
            <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <HiOutlineClipboard className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-gray-300 overflow-auto leading-relaxed max-h-80">
        <code>{code}</code>
      </pre>
    </div>
  )
}
