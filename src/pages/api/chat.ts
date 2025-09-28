import { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import { Todo, ChatMessage } from '@/types/todo'
import { SchedulingEngine } from '@/lib/scheduling'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const ADVANCED_SYSTEM_PROMPT = `You are an intelligent scheduling assistant that excels at understanding natural language and creating structured, actionable todos. Today's date is ${new Date().toISOString().split('T')[0]}.

## Your Core Responsibilities:

1. **Intent Recognition**: Determine if the user wants to create todos, modify existing ones, query their todos, or just chat
2. **Smart Parsing**: Extract structured data from natural language with context awareness
3. **Intelligent Scheduling**: Handle recurring patterns, relative dates, and dependencies
4. **Proactive Suggestions**: Offer helpful scheduling advice based on context

## Parsing Rules:

**Dates & Timing:**
- Parse relative dates intelligently: "next week" → specific date, "before summer" → next summer if current has passed
- Handle recurring patterns: "twice a year" = every 6 months, "monthly" = every month
- Consider urgency: "urgent", "when I have time", "by Friday"
- **IMPORTANT**: If a seasonal reference (summer, winter, spring, fall) could be ambiguous, assume the NEXT occurrence. Current date is ${new Date().toISOString().split('T')[0]}
- Ask for clarification on ambiguous dates: "Do you mean summer 2025 or 2026?"

**Categories (auto-detect):**
- Health: dentist, doctor, medical, gym, exercise
- Financial: taxes, bills, credit, spending, budget
- Personal: family, friends, calls, social
- Work: meetings, projects, deadlines, career
- Home: cleaning, maintenance, repairs, organization
- Travel: passport, visa, booking, planning

**Priority Logic:**
- HIGH: deadlines, health, legal, urgent matters, time-sensitive
- MEDIUM: important but flexible, regular maintenance, social commitments
- LOW: aspirational, someday/maybe, low-stakes tasks

**Recurring Patterns:**
- "twice a year" → every 6 months
- "quarterly" → every 3 months
- "annually" → every 12 months
- "monthly" → every month
- "weekly" → every week

## Response Format:

Always respond with:
1. **Conversational Response**: Natural, helpful reply to the user
2. **Structured Data**: JSON object with parsed todos (if any)

For todo creation, extract:
- content: Clear, actionable description
- category: Auto-detected category
- priority: Logical priority level
- dueDate: Specific date or relative timeframe
- isRecurring: Boolean
- recurringPattern: Detailed pattern if recurring
- context: Additional helpful context
- suggestions: Proactive scheduling advice

## Examples:

Input: "I need to visit the dentist twice a year"
Response:
- Conversational: "I'll set up dental visits every 6 months! When was your last appointment so I can schedule the right dates?"
- Structured: High priority health recurring todo, 6-month intervals

Input: "I have annual Amex credit that I need to spend"
Response:
- Conversational: "Good reminder! When does your credit reset? I'll make sure to remind you a few months before the deadline."
- Structured: Medium priority financial recurring todo, annual pattern

Input: "I need to renew my passport before summer" (when it's currently September 2024)
Response:
- Conversational: "I'll set that for before summer 2025, since summer 2024 has passed. Is that correct, or did you need it sooner?"
- Structured: High priority travel todo, due date June 1, 2025

Be proactive, context-aware, and always ask clarifying questions when dates could be ambiguous.`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, existingTodos = [] } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Claude API key not configured' })
  }

  try {
    // First, get conversational response
    const conversationalResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      system: ADVANCED_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `User input: "${message}"\n\nExisting todos: ${JSON.stringify(existingTodos.slice(0, 5), null, 2)}\n\nPlease provide a helpful, conversational response and determine if this input should create or modify any todos.`
        }
      ]
    })

    const conversationalText = conversationalResponse.content[0].text

    // Then, get structured data extraction
    const structuredResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: `You are a structured data extraction assistant. Analyze the user's input and return ONLY valid JSON with extracted todo information. Today's date is ${new Date().toISOString().split('T')[0]}.

Return JSON in this exact format:
{
  "intent": "create_todo" | "modify_todo" | "query_todos" | "general_chat",
  "todos": [
    {
      "content": "clear action description",
      "priority": "low" | "medium" | "high",
      "category": "health" | "financial" | "personal" | "work" | "home" | "travel" | "general",
      "dueDate": "YYYY-MM-DD" | "relative description" | null,
      "isRecurring": true | false,
      "recurringPattern": {
        "frequency": "daily" | "weekly" | "monthly" | "yearly" | "custom",
        "interval": number,
        "unit": "days" | "weeks" | "months" | "years",
        "description": "human readable pattern"
      } | null,
      "context": "additional context if needed",
      "urgency": "urgent" | "normal" | "low"
    }
  ],
  "suggestions": ["helpful suggestion 1", "helpful suggestion 2"],
  "needsClarification": "question to ask user" | null
}

If no todos are detected, return empty todos array.`,
      messages: [
        {
          role: 'user',
          content: `Extract structured todo data from: "${message}"`
        }
      ]
    })

    let structuredData
    try {
      structuredData = JSON.parse(structuredResponse.content[0].text)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      structuredData = {
        intent: 'general_chat',
        todos: [],
        suggestions: [],
        needsClarification: null
      }
    }

    // Convert parsed todos to full Todo objects using scheduling engine
    const newTodos = structuredData.todos.map((parsed: any) =>
      SchedulingEngine.createTodoFromParsed(parsed)
    )

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: conversationalText,
      timestamp: new Date(),
      todos: newTodos,
      structuredResponse: structuredData
    }

    res.status(200).json({
      message: chatMessage,
      todos: newTodos,
      structuredResponse: structuredData
    })

  } catch (error) {
    console.error('Claude API error:', error)
    res.status(500).json({ error: 'Failed to process message with Claude' })
  }
}

function extractTodosFromResponse(userInput: string, assistantResponse: string): Todo[] {
  // Simple heuristic - if user input seems like a todo, create one
  // This is a basic implementation - you can enhance with more sophisticated NLP

  const todoKeywords = ['need to', 'should', 'have to', 'want to', 'remind me', 'schedule']
  const hasKeyword = todoKeywords.some(keyword => userInput.toLowerCase().includes(keyword))

  if (hasKeyword && userInput.length > 10) {
    return [{
      id: uuidv4(),
      content: userInput,
      originalInput: userInput,
      priority: 'medium',
      status: 'pending',
      isRecurring: false,
      createdAt: new Date(),
      category: 'general'
    }]
  }

  return []
}