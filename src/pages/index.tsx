import Head from 'next/head'

export default function Home() {
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
              and let AI handle the scheduling and reminders.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">💬 Chat with your todos</h2>
            <div className="space-y-4">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Try: 'I need to renew my passport before summer'"
                  className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-6 py-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">📝 Your Todos</h2>
            <div className="text-gray-500 text-center py-8">
              No todos yet. Start by chatting above!
            </div>
          </div>
        </div>
      </main>
    </>
  )
}