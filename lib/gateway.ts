'use client'

/**
 * Lyzr API Gateway — Client Utility
 *
 * Convenience wrapper for calling the unified gateway from client components.
 * All requests go through /api/gateway/{service}/{path} so the API key
 * is never exposed to the browser.
 *
 * @example
 * ```tsx
 * import { gateway, useGateway } from '@/lib/gateway'
 *
 * // Direct call
 * const result = await gateway.agent.post('inference/chat/task', { message: 'Hi', agent_id: '...' })
 *
 * // React hook
 * const { request, loading, error, data } = useGateway()
 * await request('agent', 'inference/chat/task', { method: 'POST', body: { ... } })
 * ```
 */

import { useState, useCallback } from 'react'

const GATEWAY_BASE = '/api/gateway'

// ─── Types ───────────────────────────────────────────────────────────────

export type GatewayService = 'agent' | 'rag' | 'scheduler' | 'voice'

export interface GatewayRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, any> | FormData
  params?: Record<string, string>
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface GatewayResponse<T = any> {
  ok: boolean
  status: number
  data: T
  service: string
  upstreamStatus: number
}

export interface GatewayInfo {
  gateway: string
  version: string
  status: string
  api_key_configured: boolean
  api_key_preview: string | null
  services: Record<string, {
    proxy_path: string
    upstream: string
    description: string
    examples: string[]
  }>
  timestamp: string
}

// ─── Core Request Function ──────────────────────────────────────────────

export async function gatewayRequest<T = any>(
  service: GatewayService,
  path: string,
  options: GatewayRequestOptions = {}
): Promise<GatewayResponse<T>> {
  const { method = 'GET', body, params, headers: extraHeaders, signal } = options

  // Build URL
  const cleanPath = path.replace(/^\//, '')
  let url = `${GATEWAY_BASE}/${service}/${cleanPath}`

  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    signal,
  }

  const headers: Record<string, string> = { ...extraHeaders }

  if (body) {
    if (body instanceof FormData) {
      fetchOptions.body = body
      // Don't set content-type for FormData — browser sets it with boundary
    } else {
      fetchOptions.body = JSON.stringify(body)
      headers['content-type'] = 'application/json'
    }
  }

  if (Object.keys(headers).length > 0) {
    fetchOptions.headers = headers
  }

  const response = await fetch(url, fetchOptions)
  const contentType = response.headers.get('content-type') || ''

  let data: T
  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = (await response.text()) as unknown as T
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    service: response.headers.get('x-gateway-service') || service,
    upstreamStatus: parseInt(response.headers.get('x-gateway-upstream-status') || String(response.status), 10),
  }
}

// ─── Service-Specific Helpers ───────────────────────────────────────────

function createServiceHelper(service: GatewayService) {
  return {
    get: <T = any>(path: string, params?: Record<string, string>, signal?: AbortSignal) =>
      gatewayRequest<T>(service, path, { method: 'GET', params, signal }),

    post: <T = any>(path: string, body?: Record<string, any> | FormData, signal?: AbortSignal) =>
      gatewayRequest<T>(service, path, { method: 'POST', body, signal }),

    put: <T = any>(path: string, body?: Record<string, any>, signal?: AbortSignal) =>
      gatewayRequest<T>(service, path, { method: 'PUT', body, signal }),

    patch: <T = any>(path: string, body?: Record<string, any>, signal?: AbortSignal) =>
      gatewayRequest<T>(service, path, { method: 'PATCH', body, signal }),

    delete: <T = any>(path: string, body?: Record<string, any>, signal?: AbortSignal) =>
      gatewayRequest<T>(service, path, { method: 'DELETE', body, signal }),

    request: <T = any>(path: string, options?: GatewayRequestOptions) =>
      gatewayRequest<T>(service, path, options),
  }
}

/**
 * Pre-configured gateway clients per service
 */
export const gateway = {
  agent: createServiceHelper('agent'),
  rag: createServiceHelper('rag'),
  scheduler: createServiceHelper('scheduler'),
  voice: createServiceHelper('voice'),

  /** Get gateway info/status */
  info: async (): Promise<GatewayInfo> => {
    const response = await fetch(GATEWAY_BASE)
    return response.json()
  },
}

// ─── React Hook ─────────────────────────────────────────────────────────

export function useGateway() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const request = useCallback(
    async <T = any>(
      service: GatewayService,
      path: string,
      options?: GatewayRequestOptions
    ): Promise<GatewayResponse<T>> => {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        const result = await gatewayRequest<T>(service, path, options)

        if (result.ok) {
          setData(result.data)
        } else {
          const errorData = result.data as any
          setError(errorData?.error || errorData?.message || `Request failed with status ${result.status}`)
        }

        setLoading(false)
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setError(msg)
        setLoading(false)
        throw err
      }
    },
    []
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { request, loading, error, data, reset }
}
