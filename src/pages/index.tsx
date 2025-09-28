import Head from 'next/head'
import { useState } from 'react'
import { Todo, ChatMessage } from '@/types/todo'

export default function Home() {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          existingTodos: todos
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      setChatHistory(prev => [...prev, data.message])

      if (data.todos && data.todos.length > 0) {
        setTodos(prev => [...prev, ...data.todos])
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure you have set up your Claude API key in .env.local',
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleTodo = (todoId: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === todoId
        ? { ...todo, status: todo.status === 'completed' ? 'pending' : 'completed' }
        : todo
    ))
  }

  return (
    <>
      <Head>
        <title>AI Todo List</title>
        <meta name="description" content="An intelligent todo list powered by AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🤖 AI Todo List
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Talk to your todos in natural language. Say things like "I want to visit the dentist twice a year"
              and let Claude AI handle the scheduling and reminders.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">💬 Chat with Claude</h2>

            {/* Chat History */}
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-100 ml-8 text-right'
                    : 'bg-gray-100 mr-8'
                }`}>
                  <div className="text-sm text-gray-600 mb-1">
                    {msg.role === 'user' ? 'You' : 'Claude'}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="bg-gray-100 mr-8 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Claude</div>
                  <div>Thinking...</div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Try: 'I need to renew my passport before summer'"
                className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
              >
                Send
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">📝 Your Todos ({todos.length})</h2>
            {todos.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No todos yet. Start by chatting with Claude above!
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo) => (
                  <div key={todo.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={todo.status === 'completed'}
                      onChange={() => toggleTodo(todo.id)}
                      className="w-5 h-5 text-blue-500"
                    />
                    <div className="flex-1">
                      <div className={`${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {todo.content}
                      </div>
                      <div className="text-sm text-gray-500 flex space-x-4">
                        <span>Priority: {todo.priority}</span>
                        {todo.category && <span>Category: {todo.category}</span>}
                        {todo.isRecurring && <span>🔄 Recurring</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}