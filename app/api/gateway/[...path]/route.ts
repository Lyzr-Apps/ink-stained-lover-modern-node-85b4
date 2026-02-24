/**
 * Lyzr API Gateway — Unified Catch-All Proxy
 *
 * Routes all Lyzr API calls through a single endpoint with the API key
 * injected server-side. The client never sees or needs the key.
 *
 * Usage:
 *   /api/gateway/agent/...     → https://agent-prod.studio.lyzr.ai/v3/...
 *   /api/gateway/rag/...       → https://rag-prod.studio.lyzr.ai/v3/...
 *   /api/gateway/scheduler/... → https://scheduler.studio.lyzr.ai/...
 *   /api/gateway/voice/...     → https://voice-sip.studio.lyzr.ai/...
 *
 * All HTTP methods are proxied (GET, POST, PUT, PATCH, DELETE).
 * Query parameters, headers, and body are forwarded transparently.
 * The x-api-key header is injected automatically.
 */

import { NextRequest, NextResponse } from 'next/server'

const LYZR_API_KEY = process.env.LYZR_API_KEY || ''

// Service routing table
const SERVICE_MAP: Record<string, { baseUrl: string; description: string }> = {
  agent: {
    baseUrl: 'https://agent-prod.studio.lyzr.ai/v3',
    description: 'Lyzr Agent API — inference, tasks, assets',
  },
  rag: {
    baseUrl: 'https://rag-prod.studio.lyzr.ai/v3',
    description: 'Lyzr RAG API — knowledge base, document training',
  },
  scheduler: {
    baseUrl: 'https://scheduler.studio.lyzr.ai',
    description: 'Lyzr Scheduler API — cron-based agent execution',
  },
  voice: {
    baseUrl: 'https://voice-sip.studio.lyzr.ai',
    description: 'Lyzr Voice API — voice session management',
  },
}

// Headers that should NOT be forwarded to upstream
const BLOCKED_HEADERS = new Set([
  'host',
  'connection',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'x-api-key', // we inject our own
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-real-ip',
])

function apiKeyGuard(): NextResponse | null {
  if (!LYZR_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'Gateway error: LYZR_API_KEY not configured on server',
        hint: 'Set LYZR_API_KEY in your .env.local file',
      },
      { status: 500 }
    )
  }
  return null
}

function resolveUpstreamUrl(pathSegments: string[], searchParams: URLSearchParams): {
  url: string
  service: string
} | null {
  if (pathSegments.length < 1) return null

  const service = pathSegments[0]
  const config = SERVICE_MAP[service]
  if (!config) return null

  // Everything after the service name becomes the upstream path
  const upstreamPath = pathSegments.slice(1).join('/')
  const queryString = searchParams.toString()
  const url = `${config.baseUrl}/${upstreamPath}${queryString ? `?${queryString}` : ''}`

  return { url, service }
}

function buildUpstreamHeaders(request: NextRequest, contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    'x-api-key': LYZR_API_KEY,
    accept: 'application/json',
  }

  // Forward safe headers from client
  request.headers.forEach((value, key) => {
    if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
      headers[key] = value
    }
  })

  // Override content-type if explicitly provided
  if (contentType) {
    headers['content-type'] = contentType
  }

  return headers
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
  // 1. API key check
  const guard = apiKeyGuard()
  if (guard) return guard

  // 2. Resolve upstream URL
  const { searchParams } = new URL(request.url)
  const resolved = resolveUpstreamUrl(params.path, searchParams)

  if (!resolved) {
    const service = params.path[0]
    return NextResponse.json(
      {
        success: false,
        error: `Unknown service: "${service}"`,
        available_services: Object.keys(SERVICE_MAP),
        usage: '/api/gateway/{service}/{path}',
      },
      { status: 404 }
    )
  }

  // 3. Build the upstream request
  const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(request.method)
  const contentType = request.headers.get('content-type') || ''
  const isFormData = contentType.includes('multipart/form-data')

  let body: BodyInit | undefined
  let explicitContentType: string | undefined

  if (isBodyMethod) {
    if (isFormData) {
      // For multipart, pass the raw body — let fetch set the boundary
      body = await request.formData()
      // Don't set content-type; fetch will add it with the correct boundary
    } else {
      // For JSON or other content types, forward the raw text
      body = await request.text()
      explicitContentType = contentType || 'application/json'
    }
  }

  const headers = buildUpstreamHeaders(request, isFormData ? undefined : explicitContentType)

  // 4. Execute upstream request
  try {
    const upstreamResponse = await fetch(resolved.url, {
      method: request.method,
      headers,
      body,
    })

    // 5. Build downstream response
    const responseContentType = upstreamResponse.headers.get('content-type') || ''
    let responseBody: string | ArrayBuffer

    if (responseContentType.includes('application/json')) {
      responseBody = await upstreamResponse.text()
    } else if (
      responseContentType.includes('application/octet-stream') ||
      responseContentType.includes('audio/') ||
      responseContentType.includes('image/')
    ) {
      responseBody = await upstreamResponse.arrayBuffer()
    } else {
      responseBody = await upstreamResponse.text()
    }

    // Forward response headers (selective)
    const responseHeaders = new Headers()
    responseHeaders.set('content-type', responseContentType || 'application/json')
    responseHeaders.set('x-gateway-service', resolved.service)
    responseHeaders.set('x-gateway-upstream-status', String(upstreamResponse.status))

    // Forward rate limit headers if present
    const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
    for (const h of rateLimitHeaders) {
      const val = upstreamResponse.headers.get(h)
      if (val) responseHeaders.set(h, val)
    }

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Gateway error: Failed to reach upstream service',
        service: resolved.service,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}

// Export all HTTP methods
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyRequest(request, params)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyRequest(request, params)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyRequest(request, params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyRequest(request, params)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyRequest(request, params)
}
