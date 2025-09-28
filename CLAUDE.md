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
- **Database**: SQLite with better-sqlite3 for local development
- **LLM Integration**: OpenAI API for natural language processing
- **Vector Search**: Simple cosine similarity for semantic todo matching

## Key Features to Implement

1. Natural language todo parsing ("visit dentist twice a year")
2. Conversational interface for todo management
3. Smart scheduling and context-aware reminders
4. Semantic search across todo history
5. Simple user authentication (max 5 users)