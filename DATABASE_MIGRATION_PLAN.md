# Database Migration Plan: In-Memory to Vercel Postgres

## Current State
- **Storage**: React state only (in-memory)
- **Persistence**: None - data lost on refresh
- **Users**: Single session, no sharing

## Target Architecture: Multi-Environment Vercel Postgres

### 1. Environment Separation Strategy
```typescript
// Different databases for different environments
const getDatabaseUrl = () => {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'production':
      return process.env.POSTGRES_URL_PROD
    case 'preview': // Vercel preview deployments
      return process.env.POSTGRES_URL_PREVIEW
    case 'development':
    default:
      return process.env.POSTGRES_URL_DEV
  }
}
```

### 2. Database Instances
- **Dev Database**: `ai-todolist-dev` (development/testing)
- **Prod Database**: `ai-todolist-prod` (production only)
- **Preview**: Uses dev database for preview deployments

### 3. Environment Configuration
```typescript
// src/lib/database.ts
export const getDbConnection = () => {
  const isDev = process.env.NODE_ENV !== 'production'
  const dbUrl = isDev ? process.env.POSTGRES_URL_DEV : process.env.POSTGRES_URL_PROD

  if (!dbUrl) {
    throw new Error(`Database URL not configured for ${process.env.NODE_ENV}`)
  }

  return dbUrl
}
```

### 4. Schema Design
```sql
-- Todos table
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  original_input TEXT NOT NULL,
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'delayed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  category VARCHAR(50),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  ai_suggestions JSONB,
  parent_id UUID REFERENCES todos(id)
);

-- Todo instances for recurring todos
CREATE TABLE todo_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES todos(id),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_completed_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'completed', 'delayed', 'cancelled')),
  delay_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  structured_response JSONB,
  session_id UUID -- For future multi-user support
);

-- Indexes for performance
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_created_at ON todos(created_at);
CREATE INDEX idx_todo_instances_parent ON todo_instances(parent_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
```

### 5. Implementation Steps

#### Step 1: Setup Vercel Postgres
```bash
# Install Vercel Postgres client
npm install @vercel/postgres

# Create databases in Vercel dashboard:
# - ai-todolist-dev
# - ai-todolist-prod
```

#### Step 2: Environment Variables
```bash
# .env.local (development)
POSTGRES_URL_DEV="postgres://..."
ANTHROPIC_API_KEY="..."

# Vercel production environment
POSTGRES_URL_PROD="postgres://..."
ANTHROPIC_API_KEY="..."
```

#### Step 3: Database Layer
```typescript
// src/lib/database.ts
import { sql } from '@vercel/postgres'

export class DatabaseService {
  static async getTodos(): Promise<Todo[]> {
    const result = await sql`
      SELECT * FROM todos
      WHERE status != 'cancelled'
      ORDER BY created_at DESC
    `
    return result.rows.map(this.mapRowToTodo)
  }

  static async createTodo(todo: Todo): Promise<Todo> {
    const result = await sql`
      INSERT INTO todos (
        id, content, original_input, priority, status,
        due_date, category, is_recurring, recurring_pattern,
        ai_suggestions
      ) VALUES (
        ${todo.id}, ${todo.content}, ${todo.originalInput},
        ${todo.priority}, ${todo.status}, ${todo.dueDate},
        ${todo.category}, ${todo.isRecurring},
        ${JSON.stringify(todo.recurringPattern)},
        ${JSON.stringify(todo.aiSuggestions)}
      ) RETURNING *
    `
    return this.mapRowToTodo(result.rows[0])
  }

  static async saveChatMessage(message: ChatMessage): Promise<void> {
    await sql`
      INSERT INTO chat_messages (id, role, content, timestamp, structured_response)
      VALUES (
        ${message.id}, ${message.role}, ${message.content},
        ${message.timestamp.toISOString()},
        ${JSON.stringify(message.structuredResponse)}
      )
    `
  }
}
```

#### Step 4: API Route Updates
```typescript
// src/pages/api/chat.ts
import { DatabaseService } from '@/lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... existing Claude integration ...

  // Save chat message
  await DatabaseService.saveChatMessage(chatMessage)

  // Save todos to database
  const savedTodos = await Promise.all(
    newTodos.map(todo => DatabaseService.createTodo(todo))
  )

  res.status(200).json({
    message: chatMessage,
    todos: savedTodos,
    structuredResponse: structuredData
  })
}
```

#### Step 5: Frontend Updates
```typescript
// src/pages/index.tsx - Load existing data on mount
useEffect(() => {
  const loadExistingData = async () => {
    try {
      const todosResponse = await fetch('/api/todos')
      const todosData = await todosResponse.json()
      setTodos(todosData.todos)

      const chatResponse = await fetch('/api/chat-history')
      const chatData = await chatResponse.json()
      setChatHistory(chatData.messages)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  loadExistingData()
}, [])
```

### 6. Migration Strategy
1. **Phase 1**: Add database layer alongside existing in-memory storage
2. **Phase 2**: Test database operations in development
3. **Phase 3**: Switch to database-first, keep in-memory as fallback
4. **Phase 4**: Remove in-memory storage completely

### 7. Testing Workflow
- **Development**: Full testing on dev database
- **Preview**: Automatic preview deployments use dev database
- **Production**: Only real user data, clean separation

### 8. Safety Features
```typescript
// Data validation
if (process.env.NODE_ENV === 'production' && content.includes('test')) {
  console.warn('Possible test data in production')
}

// Connection health check
export async function checkDatabaseHealth() {
  try {
    await sql`SELECT 1`
    return { status: 'healthy' }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}
```

## Benefits
✅ **Clean separation**: Dev and prod databases isolated
✅ **Safe testing**: Test freely without affecting production
✅ **Vercel native**: Optimized for serverless deployment
✅ **Scalable**: Ready for multi-user expansion
✅ **Type-safe**: Full TypeScript integration
✅ **Persistent**: Data survives deployments and restarts

## Next Steps
1. Continue testing current in-memory implementation
2. When ready, implement Step 1 (Setup Vercel Postgres)
3. Gradual migration following the phases above
4. Production deployment with clean data separation

This plan ensures zero downtime and safe migration from prototype to production-ready database!