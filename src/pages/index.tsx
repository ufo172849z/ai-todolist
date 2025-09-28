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
          existingTodos: todos,
          chatHistory: chatHistory.slice(-6) // Send last 6 messages for context
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

      // Add visual indication if clarification was needed
      if (data.structuredResponse?.needsClarification) {
        console.log('Clarification needed:', data.structuredResponse.needsClarification)
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

            {/* Example suggestions for new users */}
            {chatHistory.length === 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-700 mb-2">Try these examples:</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "I need to visit the dentist twice a year",
                    "Remind me to renew my passport before summer",
                    "I have annual Amex credit to spend",
                    "Call mom this weekend",
                    "File my taxes quarterly"
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setMessage(example)}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              <div className="space-y-4">
                {todos.map((todo) => (
                  <div key={todo.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={todo.status === 'completed'}
                        onChange={() => toggleTodo(todo.id)}
                        className="w-5 h-5 text-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className={`text-lg ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                          {todo.content}
                        </div>

                        {/* Priority and Category */}
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                            todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {todo.priority} priority
                          </span>
                          {todo.category && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {todo.category}
                            </span>
                          )}
                        </div>

                        {/* Due Date */}
                        {todo.dueDate && (
                          <div className="mt-2 text-sm text-gray-600">
                            📅 Due: {new Date(todo.dueDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}

                        {/* Recurring Pattern */}
                        {todo.isRecurring && todo.recurringPattern && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2 text-sm text-indigo-600">
                              <span>🔄</span>
                              <span>
                                Recurring: Every {todo.recurringPattern.interval} {todo.recurringPattern.unit}
                              </span>
                            </div>
                            {todo.recurringPattern.nextDueDate && (
                              <div className="text-sm text-gray-500 ml-6">
                                Next: {new Date(todo.recurringPattern.nextDueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Future Instances for Recurring Todos */}
                        {todo.instances && todo.instances.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-2">Upcoming:</div>
                            <div className="space-y-1">
                              {todo.instances.slice(0, 3).map((instance, index) => (
                                <div key={instance.id} className="text-sm text-gray-600 flex items-center space-x-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    instance.status === 'scheduled' ? 'bg-blue-400' :
                                    instance.status === 'delayed' ? 'bg-yellow-400' :
                                    'bg-green-400'
                                  }`}></span>
                                  <span>
                                    {new Date(instance.scheduledDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  {instance.status === 'delayed' && (
                                    <span className="text-yellow-600 text-xs">(rescheduled)</span>
                                  )}
                                </div>
                              ))}
                              {todo.instances.length > 3 && (
                                <div className="text-xs text-gray-400">
                                  +{todo.instances.length - 3} more scheduled
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AI Suggestions */}
                        {todo.aiSuggestions && todo.aiSuggestions.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-700 mb-1">💡 AI Suggestions:</div>
                            <ul className="text-sm text-blue-600 space-y-1">
                              {todo.aiSuggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Original Input */}
                        {todo.originalInput !== todo.content && (
                          <div className="mt-2 text-xs text-gray-400">
                            From: "{todo.originalInput}"
                          </div>
                        )}
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