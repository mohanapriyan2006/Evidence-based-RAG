export interface Citation {
  id: string
  part: string
  section: string
  text: string
}

export interface AskResponse {
  status: 'answered' | 'refused' | 'conflict'
  answer: string
  sources: Citation[]
}
