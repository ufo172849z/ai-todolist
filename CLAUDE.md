# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An LLM-powered todo list application that understands natural language input and provides conversational task management. Built with Next.js, deployed on Vercel, using SQLite for data storage and OpenAI API for LLM capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## Architecture

- **Frontend**: Next.js React app with conversational UI
- **Backend**: Vercel serverless functions (`/pages/api/`)
- **Database**: JSON-based storage (will migrate to cloud database later)
- **LLM Integration**: Anthropic Claude API for natural language processing
- **Vector Search**: Simple cosine similarity for semantic todo matching (future enhancement)

## Setup Instructions

1. **Install dependencies**: `npm install`
2. **Set up Claude API**:
   - Get API key from https://console.anthropic.com/
   - Copy `.env.local.example` to `.env.local`
   - Add your API key: `ANTHROPIC_API_KEY=your_key_here`
3. **Start development**: `npm run dev`

## Key Features

- ✅ **Natural language todo parsing**: "I need to visit dentist twice a year"
- ✅ **Conversational interface**: Chat with Claude about your todos
- ✅ **Smart todo extraction**: AI automatically creates structured todos from natural input
- ✅ **Todo management**: Check off, toggle completion status
- 🔄 **Smart scheduling** (in progress)
- 🔄 **Recurring tasks** (in progress)
- 🔄 **Persistent storage** (currently in-memory)