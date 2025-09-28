export interface Todo {
  id: string
  content: string
  originalInput: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'completed'
  dueDate?: Date
  category?: string
  isRecurring: boolean
  recurringPattern?: string
  createdAt: Date
  completedAt?: Date
  aiSuggestions?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  todos?: Todo[]
}