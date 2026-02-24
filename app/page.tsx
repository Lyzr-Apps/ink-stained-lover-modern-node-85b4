'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent, extractText, type AIAgentResponse } from '@/lib/aiAgent'
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
  HiOutlineChatBubbleLeftRight,
  HiOutlineCog6Tooth,
  HiOutlineUser,
  HiOutlineCpuChip,
  HiOutlineInformationCircle,
  HiOutlineStopCircle,
} from 'react-icons/hi2'

// ─── Types ───────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  timestamp: string
  duration?: number
  raw?: any
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

type TabKey = 'chat' | 'dashboard' | 'api'

// ─── Constants ──────────────────────────────────────────────────────────

const SERVICE_CONFIGS = [
  { key: 'agent' as GatewayService, label: 'Agent', desc: 'AI inference, async tasks, file uploads', icon: HiOutlineBolt, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { key: 'rag' as GatewayService, label: 'RAG', desc: 'Knowledge base, document training', icon: HiOutlineDocumentText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { key: 'scheduler' as GatewayService, label: 'Scheduler', desc: 'Cron jobs, triggers, execution logs', icon: HiOutlineCalendar, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { key: 'voice' as GatewayService, label: 'Voice', desc: 'Voice sessions, WebSocket setup', icon: HiOutlineMicrophone, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function GatewayPage() {
  const [tab, setTab] = useState<TabKey>('chat')
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)

  const fetchInfo = useCallback(async () => {
    setInfoLoading(true)
    try {
      const info = await gateway.info()
      setGatewayInfo(info)
    } catch {}
    setInfoLoading(false)
  }, [])

  useEffect(() => { fetchInfo() }, [fetchInfo])

  const tabs: { key: TabKey; label: string; icon: typeof HiOutlineChatBubbleLeftRight }[] = [
    { key: 'chat', label: 'Chat', icon: HiOutlineChatBubbleLeftRight },
    { key: 'dashboard', label: 'Dashboard', icon: HiOutlineServer },
    { key: 'api', label: 'API Console', icon: HiOutlineBeaker },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <HiOutlineServer className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white leading-none">Lyzr API Gateway</h1>
                <p className="text-[10px] text-gray-500 mt-0.5">Built-in key -- no auth needed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gatewayInfo && (
                <span className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  gatewayInfo.status === 'operational'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${gatewayInfo.status === 'operational' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {gatewayInfo.status === 'operational' ? 'Online' : 'Error'}
                </span>
              )}
              <button onClick={fetchInfo} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title="Refresh">
                <HiOutlineArrowPath className={`w-4 h-4 text-gray-400 ${infoLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col">
        {tab === 'chat' && <ChatTab />}
        {tab === 'dashboard' && <DashboardTab gatewayInfo={gatewayInfo} infoLoading={infoLoading} />}
        {tab === 'api' && <ApiConsoleTab />}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CHAT TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChatTab() {
  const [agentId, setAgentId] = useState('')
  const [agentIdSaved, setAgentIdSaved] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [showConfig, setShowConfig] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSaveAgent = () => {
    if (!agentId.trim()) return
    setAgentIdSaved(agentId.trim())
    setSessionId(`session-${Date.now()}`)
    setMessages([])
    setShowConfig(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSend = async () => {
    if (!input.trim() || !agentIdSaved || loading) return
    const userMsg: ChatMessage = {
      id: crypto.randomUUID?.() || String(Date.now()),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const start = performance.now()
    try {
      const result: AIAgentResponse = await callAIAgent(userMsg.content, agentIdSaved, {
        session_id: sessionId,
      })
      const duration = Math.round(performance.now() - start)

      if (result.success) {
        const text = extractText(result.response)
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID?.() || String(Date.now()),
          role: 'assistant',
          content: text || JSON.stringify(result.response.result, null, 2),
          timestamp: new Date().toISOString(),
          duration,
          raw: result,
        }
        setMessages(prev => [...prev, assistantMsg])
      } else {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID?.() || String(Date.now()),
          role: 'error',
          content: result.error || result.response?.message || 'Unknown error from agent',
          timestamp: new Date().toISOString(),
          duration,
          raw: result,
        }
        setMessages(prev => [...prev, errorMsg])
      }
    } catch (err) {
      const duration = Math.round(performance.now() - start)
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID?.() || String(Date.now()),
        role: 'error',
        content: err instanceof Error ? err.message : 'Network error',
        timestamp: new Date().toISOString(),
        duration,
      }
      setMessages(prev => [...prev, errorMsg])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([])
    setSessionId(`session-${Date.now()}`)
  }

  // ─── Agent ID Config Panel ────────────────────────────────────────
  if (showConfig || !agentIdSaved) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-800/80 bg-gray-900/50 p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <HiOutlineChatBubbleLeftRight className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white text-center mb-1">Start a Conversation</h2>
            <p className="text-xs text-gray-500 text-center mb-6">
              Enter your Agent ID to start chatting. The API key is already built into the gateway -- no authentication needed.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">Agent ID</label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="e.g. 682c3a0f5e2b4f1a9c0d..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAgent() }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleSaveAgent}
                disabled={!agentId.trim()}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <HiOutlineBolt className="w-4 h-4" />
                Connect to Agent
              </button>
            </div>
            <div className="mt-6 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-start gap-2">
                <HiOutlineShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  The Lyzr API key is embedded server-side. All requests go through <code className="text-gray-400 bg-gray-900 px-1 rounded">/api/agent</code> which injects <code className="text-gray-400 bg-gray-900 px-1 rounded">x-api-key</code> automatically. No rate limits on your end.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Chat Interface ───────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
      {/* Agent bar */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-gray-800/60 flex items-center justify-between bg-gray-950/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <HiOutlineCpuChip className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-300">Agent</span>
            <span className="text-xs font-mono text-gray-500 ml-2">{agentIdSaved.slice(0, 12)}...</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title="Clear chat">
            <HiOutlineTrash className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={() => setShowConfig(true)} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title="Change agent">
            <HiOutlineCog6Tooth className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4">
              <HiOutlineChatBubbleLeftRight className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500 mb-1">No messages yet</p>
            <p className="text-xs text-gray-600">Type a message below to start chatting with your agent.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HiOutlineCpuChip className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-gray-900/80 border border-gray-800/60">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 border-t border-gray-800/60 bg-gray-950/80 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800/80 border border-gray-700/60 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = '44px'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors flex items-center justify-center"
          >
            {loading ? (
              <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
            ) : (
              <HiOutlinePaperAirplane className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          Powered by Lyzr Gateway -- API key built-in, no limits on your end
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showRaw, setShowRaw] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%]">
          <div className="py-2.5 px-4 rounded-xl bg-blue-600/90 text-sm text-white leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-[10px] text-gray-600">{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <HiOutlineUser className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    )
  }

  if (message.role === 'error') {
    return (
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <HiOutlineXCircle className="w-4 h-4 text-red-400" />
        </div>
        <div className="max-w-[80%]">
          <div className="py-2.5 px-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-300 leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {message.duration && (
              <span className="flex items-center gap-1 text-[10px] text-gray-600">
                <HiOutlineClock className="w-3 h-3" />
                {message.duration}ms
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Assistant
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <HiOutlineCpuChip className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="max-w-[80%] min-w-0">
        <div className="py-2.5 px-4 rounded-xl bg-gray-900/80 border border-gray-800/60 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {message.duration && (
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <HiOutlineClock className="w-3 h-3" />
              {message.duration}ms
            </span>
          )}
          {message.raw && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              <HiOutlineCodeBracket className="w-3 h-3" />
              {showRaw ? 'Hide' : 'Raw'}
            </button>
          )}
          <span className="text-[10px] text-gray-600">{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        {showRaw && message.raw && (
          <pre className="mt-2 p-3 rounded-lg bg-gray-950 border border-gray-800/60 text-[11px] font-mono text-gray-400 overflow-auto max-h-60 leading-relaxed">
            {JSON.stringify(message.raw, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DASHBOARD TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DashboardTab({ gatewayInfo, infoLoading }: { gatewayInfo: GatewayInfo | null; infoLoading: boolean }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard icon={<HiOutlineShieldCheck className="w-5 h-5" />} label="Security" value="Server-Side Key" sub="Never exposed to browser" color="text-emerald-400" bg="bg-emerald-500/10" />
          <MetricCard icon={<HiOutlineKey className="w-5 h-5" />} label="API Key" value={gatewayInfo?.api_key_preview || (infoLoading ? '...' : 'Not set')} sub={gatewayInfo?.api_key_configured ? 'Configured' : 'Missing'} color={gatewayInfo?.api_key_configured ? 'text-blue-400' : 'text-red-400'} bg={gatewayInfo?.api_key_configured ? 'bg-blue-500/10' : 'bg-red-500/10'} />
          <MetricCard icon={<HiOutlineGlobeAlt className="w-5 h-5" />} label="Services" value="4 Connected" sub="Agent, RAG, Scheduler, Voice" color="text-indigo-400" bg="bg-indigo-500/10" />
        </div>

        {/* Service Routing */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineServer className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Service Routing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICE_CONFIGS.map((svc) => {
              const Icon = svc.icon
              const info = gatewayInfo?.services[svc.key]
              const proxyPath = info?.proxy_path || `/api/gateway/${svc.key}/{path}`
              return (
                <div key={svc.key} className={`rounded-xl border ${svc.border} ${svc.bg} p-5 transition-all hover:border-gray-600`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg bg-gray-900/60 flex items-center justify-center ${svc.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{svc.label}</h3>
                      <p className="text-xs text-gray-500">{svc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-gray-400 bg-gray-950/60 px-3 py-1.5 rounded-md border border-gray-800/40 truncate">{proxyPath}</code>
                    <button onClick={() => copy(proxyPath, `svc-${svc.key}`)} className="p-1.5 rounded-md hover:bg-gray-800/60 transition-colors">
                      {copiedId === `svc-${svc.key}` ? <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-400" /> : <HiOutlineClipboard className="w-3.5 h-3.5 text-gray-500" />}
                    </button>
                  </div>
                  {info?.upstream && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <HiOutlineChevronRight className="w-3 h-3 flex-shrink-0" />
                      <span className="font-mono truncate">{info.upstream}</span>
                    </div>
                  )}
                  {info?.examples && info.examples.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {info.examples.slice(0, 3).map((ex, i) => {
                        const parts = ex.trim().split(/\s+/)
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${METHOD_COLORS[parts[0]] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>{parts[0]}</span>
                            <span className="font-mono text-gray-500 truncate">{parts.slice(1).join(' ')}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Usage */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineCodeBracket className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Usage</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/60">
                <HiOutlineCodeBracket className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-400">TypeScript</span>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-300 overflow-auto leading-relaxed max-h-72">
{`import { callAIAgent } from '@/lib/aiAgent'

// Chat with an agent -- key is built-in
const result = await callAIAgent(
  'Hello!',
  'your-agent-id-here'
)

if (result.success) {
  console.log(result.response.result)
}

// Or use the gateway directly:
import { gateway } from '@/lib/gateway'

const r = await gateway.agent.post(
  'inference/chat/task',
  { message: 'Hi', agent_id: '...' }
)`}
              </pre>
            </div>
            <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/60">
                <HiOutlineCodeBracket className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-400">curl</span>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-300 overflow-auto leading-relaxed max-h-72">
{`# No API key needed in requests

# Chat via /api/agent (recommended)
curl -X POST /api/agent \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello","agent_id":"..."}'

# Or use the raw gateway proxy
curl -X POST /api/gateway/agent/inference/chat/task \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello","agent_id":"..."}'

# Key is injected server-side automatically`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color, bg }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white font-mono">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  API CONSOLE TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ApiConsoleTab() {
  const [method, setMethod] = useState('GET')
  const [service, setService] = useState<GatewayService>('agent')
  const [path, setPath] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleSend = async () => {
    if (!path.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    setStatus(null)
    setDuration(null)

    const start = performance.now()
    try {
      let parsedBody: Record<string, any> | undefined
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        try { parsedBody = JSON.parse(body) } catch { setError('Invalid JSON body'); setLoading(false); return }
      }
      const r = await gatewayRequest(service, path, { method: method as any, body: parsedBody })
      const d = Math.round(performance.now() - start)
      setResult(r.data)
      setStatus(r.status)
      setDuration(d)
      setLogs(prev => [{ id: String(Date.now()), timestamp: new Date().toISOString(), method, service, path: path.trim(), status: r.status, duration: d, ok: r.ok }, ...prev].slice(0, 50))
    } catch (err) {
      const d = Math.round(performance.now() - start)
      setDuration(d)
      setError(err instanceof Error ? err.message : 'Network error')
      setLogs(prev => [{ id: String(Date.now()), timestamp: new Date().toISOString(), method, service, path: path.trim(), status: 0, duration: d, ok: false }, ...prev].slice(0, 50))
    }
    setLoading(false)
  }

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) })
  }, [])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Console */}
        <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden">
          <div className="p-4 border-b border-gray-800/60">
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-28">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={service} onChange={(e) => setService(e.target.value as GatewayService)} className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-32">
                {SERVICE_CONFIGS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <div className="flex-1 flex gap-2">
                <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="path (e.g. inference/chat/task)" className="flex-1 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }} />
                <button onClick={handleSend} disabled={loading || !path.trim()} className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium flex items-center gap-2 transition-colors">
                  {loading ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> : <HiOutlinePaperAirplane className="w-4 h-4" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600 font-mono">/api/gateway/{service}/{path || '...'}</p>
            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">Request Body (JSON)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"message": "Hello", "agent_id": "..."}' rows={4} className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y" />
              </div>
            )}
          </div>
          {(result || error) && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">Response</span>
                  {status !== null && (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono border ${status >= 200 && status < 300 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {status >= 200 && status < 300 ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> : <HiOutlineXCircle className="w-3.5 h-3.5" />}
                      {status}
                    </span>
                  )}
                  {duration !== null && <span className="flex items-center gap-1 text-xs text-gray-500"><HiOutlineClock className="w-3.5 h-3.5" />{duration}ms</span>}
                </div>
                {result && (
                  <button onClick={() => copy(JSON.stringify(result, null, 2), 'resp')} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
                    {copiedId === 'resp' ? <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-400" /> : <HiOutlineClipboard className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <pre className="p-4 rounded-lg bg-gray-950 border border-gray-800/60 text-xs font-mono text-gray-300 overflow-auto max-h-96 leading-relaxed">
                {error ? <span className="text-red-400">{error}</span> : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Log */}
        {logs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HiOutlineClock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-white">Request Log</span>
                <span className="text-xs text-gray-500">{logs.length}</span>
              </div>
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"><HiOutlineTrash className="w-3 h-3" /> Clear</button>
            </div>
            <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 divide-y divide-gray-800/40 overflow-hidden">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/30 transition-colors text-xs">
                  <span className={`px-2 py-0.5 rounded font-mono font-medium border ${METHOD_COLORS[log.method] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>{log.method}</span>
                  <span className={SERVICE_CONFIGS.find(s => s.key === log.service)?.color || 'text-gray-400'}>{log.service}</span>
                  <span className="font-mono text-gray-400 truncate flex-1">/{log.path}</span>
                  <span className={`inline-flex items-center gap-1 font-mono ${log.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {log.ok ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> : <HiOutlineXCircle className="w-3.5 h-3.5" />}
                    {log.status || 'ERR'}
                  </span>
                  <span className="text-gray-600 font-mono w-14 text-right">{log.duration}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
