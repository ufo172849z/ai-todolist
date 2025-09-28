import { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import { Todo, ChatMessage } from '@/types/todo'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an AI assistant that helps users manage their todos in a natural, conversational way. Your job is to:

1. Parse natural language input into structured todo items
2. Extract due dates, priorities, and recurring patterns
3. Provide helpful scheduling suggestions
4. Maintain a conversational, friendly tone

When a user gives you a todo-like input, extract:
- The main task description
- Priority level (high/medium/low)
- Due date or deadline (if mentioned)
- Whether it's recurring and the pattern
- Suggested category

Examples:
- "I need to visit the dentist twice a year" → Recurring todo, high priority, health category
- "Buy groceries this weekend" → One-time todo, medium priority, due this weekend
- "Call mom" → One-time todo, medium priority, no specific deadline

Always respond in a helpful, conversational manner and ask clarifying questions when needed.`

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
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `User input: "${message}"\n\nExisting todos: ${JSON.stringify(existingTodos, null, 2)}\n\nPlease respond conversationally and extract any todo items from this input. If this creates or modifies todos, include them in your response.`
        }
      ]
    })

    const assistantMessage = response.content[0].text

    // Simple todo extraction logic (you can enhance this with more sophisticated parsing)
    const possibleTodos = extractTodosFromResponse(message, assistantMessage)

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date(),
      todos: possibleTodos
    }

    res.status(200).json({
      message: chatMessage,
      todos: possibleTodos
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