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

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "answered" | "refused" | "conflict" | "error";
  sources?: Citation[];
  followUps?: string[];
}

export interface QuickAction {
  label: string;
  desc: string;
  prompt: string;
  icon: React.ReactNode;
}

export interface ClauseDetail {
  id: string;
  part: string;
  section: string;
  text: string;
}


