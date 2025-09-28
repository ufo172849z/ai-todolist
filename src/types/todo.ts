export interface Todo {
  id: string
  content: string
  originalInput: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'completed' | 'delayed' | 'cancelled'
  dueDate?: Date
  category?: string
  isRecurring: boolean
  recurringPattern?: RecurringPattern
  createdAt: Date
  completedAt?: Date
  aiSuggestions?: string[]
  instances?: TodoInstance[]
  parentId?: string // For recurring todo instances
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number // e.g., 6 for "every 6 months"
  unit: 'days' | 'weeks' | 'months' | 'years'
  endDate?: Date
  maxOccurrences?: number
  nextDueDate?: Date
}

export interface TodoInstance {
  id: string
  parentId: string
  scheduledDate: Date
  actualCompletedDate?: Date
  status: 'scheduled' | 'completed' | 'delayed' | 'cancelled'
  delayReason?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  todos?: Todo[]
  structuredResponse?: StructuredTodoResponse
}

export interface StructuredTodoResponse {
  intent: 'create_todo' | 'modify_todo' | 'query_todos' | 'general_chat'
  todos: ParsedTodo[]
  suggestions: string[]
  needsClarification?: string
}

export interface ParsedTodo {
  content: string
  priority: 'low' | 'medium' | 'high'
  category: string
  dueDate?: string // ISO string or relative date
  isRecurring: boolean
  recurringPattern?: {
    frequency: string
    interval: number
    unit: string
    description: string
  }
  context?: string
  urgency?: string
}