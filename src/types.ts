export interface PlanStep {
  id: string;
  name: string;
  timeEstimate: string;
  timeSlot: string;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning?: string;
}

export interface ChatResponse {
  plan: PlanStep[];
  aiMessage: string;
  reasoning: string;
}
