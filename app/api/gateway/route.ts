/**
 * Gateway Info Endpoint
 *
 * GET /api/gateway — returns gateway status, available services, and usage docs.
 * This serves as the gateway's "root" when no service path is given.
 */

import { NextResponse } from 'next/server'

const LYZR_API_KEY = process.env.LYZR_API_KEY || ''

export async function GET() {
  const keyConfigured = !!LYZR_API_KEY
  const keyPreview = keyConfigured
    ? `${LYZR_API_KEY.slice(0, 6)}...${LYZR_API_KEY.slice(-4)}`
    : null

  return NextResponse.json({
    gateway: 'Lyzr API Gateway',
    version: '1.0.0',
    status: keyConfigured ? 'operational' : 'misconfigured',
    api_key_configured: keyConfigured,
    api_key_preview: keyPreview,
    services: {
      agent: {
        proxy_path: '/api/gateway/agent/{path}',
        upstream: 'https://agent-prod.studio.lyzr.ai/v3/{path}',
        description: 'AI Agent inference, async tasks, file uploads',
        examples: [
          'POST /api/gateway/agent/inference/chat/task',
          'GET  /api/gateway/agent/inference/chat/task/{task_id}',
          'POST /api/gateway/agent/assets/upload',
        ],
      },
      rag: {
        proxy_path: '/api/gateway/rag/{path}',
        upstream: 'https://rag-prod.studio.lyzr.ai/v3/{path}',
        description: 'RAG knowledge base, document training, queries',
        examples: [
          'GET  /api/gateway/rag/rag/documents/{rag_id}/',
          'POST /api/gateway/rag/train/pdf/?rag_id={id}',
          'DELETE /api/gateway/rag/rag/{rag_id}/docs/',
        ],
      },
      scheduler: {
        proxy_path: '/api/gateway/scheduler/{path}',
        upstream: 'https://scheduler.studio.lyzr.ai/{path}',
        description: 'Cron-based agent scheduling, triggers, logs',
        examples: [
          'GET  /api/gateway/scheduler/schedules/?user_id={key}',
          'POST /api/gateway/scheduler/schedules/',
          'POST /api/gateway/scheduler/schedules/{id}/trigger',
        ],
      },
      voice: {
        proxy_path: '/api/gateway/voice/{path}',
        upstream: 'https://voice-sip.studio.lyzr.ai/{path}',
        description: 'Voice session start, WebSocket connection setup',
        examples: [
          'POST /api/gateway/voice/session/start',
        ],
      },
    },
    timestamp: new Date().toISOString(),
  })
}
