import { AskResponse } from '../types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000'

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.detail || 'Request failed'
    throw new Error(message)
  }
  return res.json() as Promise<AskResponse>
}
