import { neon } from '@neondatabase/serverless'

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
  const match = allowed.includes(origin) ? origin : null
  return {
    'Access-Control-Allow-Origin': match || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    const sql = neon(env.DATABASE_URL)

    try {
      if (url.pathname === '/scores' && request.method === 'GET') {
        const rows = await sql`
          SELECT initials, score, loop, created_at
          FROM high_scores
          ORDER BY score DESC
          LIMIT 50
        `
        return Response.json(rows, { headers: cors })
      }

      if (url.pathname === '/scores' && request.method === 'POST') {
        const body = await request.json()
        const { initials, score, loop } = body

        // Validate
        if (typeof initials !== 'string' || !/^[A-Z]{3}$/.test(initials)) {
          return Response.json({ error: 'invalid initials' }, { status: 400, headers: cors })
        }
        if (!Number.isInteger(score) || score < 1 || score > 999999) {
          return Response.json({ error: 'invalid score' }, { status: 400, headers: cors })
        }
        if (!Number.isInteger(loop) || loop < 1 || loop > 999) {
          return Response.json({ error: 'invalid loop' }, { status: 400, headers: cors })
        }

        await sql`
          INSERT INTO high_scores (initials, score, loop)
          VALUES (${initials}, ${score}, ${loop})
        `
        return Response.json({ ok: true }, { headers: cors })
      }

      return Response.json({ error: 'not found' }, { status: 404, headers: cors })
    } catch (e) {
      return Response.json({ error: 'server error' }, { status: 500, headers: cors })
    }
  },
}
