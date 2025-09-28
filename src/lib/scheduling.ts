import { RecurringPattern, Todo, TodoInstance, ParsedTodo } from '@/types/todo'
import { v4 as uuidv4 } from 'uuid'

export class SchedulingEngine {

  /**
   * Parse relative dates and convert to actual dates
   */
  static parseRelativeDate(dateString: string): Date | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const patterns: Array<{ regex: RegExp; handler: () => Date }> = [
      // Today/Tomorrow
      { regex: /^today$/i, handler: () => today },
      { regex: /^tomorrow$/i, handler: () => new Date(today.getTime() + 24 * 60 * 60 * 1000) },

      // This week
      { regex: /^this week$/i, handler: () => new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { regex: /^next week$/i, handler: () => new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) },

      // Weekend
      { regex: /^this weekend$/i, handler: () => {
        const dayOfWeek = today.getDay()
        const daysUntilSaturday = (6 - dayOfWeek) % 7
        return new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000)
      }},

      // Months
      { regex: /^next month$/i, handler: () => new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()) },
      { regex: /^in (\d+) months?$/i, handler: () => new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()) },

      // Seasons (approximate)
      { regex: /^before summer$/i, handler: () => new Date(today.getFullYear(), 5, 1) }, // June 1st
      { regex: /^by spring$/i, handler: () => new Date(today.getFullYear(), 2, 20) }, // March 20th

      // Days of week
      { regex: /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i, handler: () => {
        // Next occurrence of that day
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const targetDay = dayNames.indexOf(dateString.toLowerCase())
        const currentDay = today.getDay()
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7
        return new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000)
      }}
    ]

    for (const pattern of patterns) {
      if (pattern.regex.test(dateString)) {
        try {
          return pattern.handler()
        } catch (error) {
          console.error('Date parsing error:', error)
          return null
        }
      }
    }

    // Try parsing as ISO date
    try {
      const parsed = new Date(dateString)
      return !isNaN(parsed.getTime()) ? parsed : null
    } catch {
      return null
    }
  }

  /**
   * Create recurring pattern from natural language
   */
  static parseRecurringPattern(description: string): RecurringPattern | null {
    const patterns: Array<{ regex: RegExp; handler: () => RecurringPattern }> = [
      {
        regex: /twice a year/i,
        handler: () => ({
          frequency: 'custom',
          interval: 6,
          unit: 'months'
        })
      },
      {
        regex: /every (\d+) months?/i,
        handler: () => ({
          frequency: 'monthly',
          interval: parseInt(description.match(/(\d+)/)?.[1] || '1'),
          unit: 'months'
        })
      },
      {
        regex: /(monthly|every month)/i,
        handler: () => ({
          frequency: 'monthly',
          interval: 1,
          unit: 'months'
        })
      },
      {
        regex: /(quarterly|every quarter)/i,
        handler: () => ({
          frequency: 'custom',
          interval: 3,
          unit: 'months'
        })
      },
      {
        regex: /(annually|yearly|every year)/i,
        handler: () => ({
          frequency: 'yearly',
          interval: 1,
          unit: 'years'
        })
      },
      {
        regex: /(weekly|every week)/i,
        handler: () => ({
          frequency: 'weekly',
          interval: 1,
          unit: 'weeks'
        })
      },
      {
        regex: /(daily|every day)/i,
        handler: () => ({
          frequency: 'daily',
          interval: 1,
          unit: 'days'
        })
      }
    ]

    for (const pattern of patterns) {
      if (pattern.regex.test(description)) {
        return pattern.handler()
      }
    }

    return null
  }

  /**
   * Calculate next due date for recurring pattern
   */
  static calculateNextDueDate(pattern: RecurringPattern, lastDate?: Date): Date {
    const baseDate = lastDate || new Date()
    const next = new Date(baseDate)

    switch (pattern.unit) {
      case 'days':
        next.setDate(next.getDate() + pattern.interval)
        break
      case 'weeks':
        next.setDate(next.getDate() + (pattern.interval * 7))
        break
      case 'months':
        next.setMonth(next.getMonth() + pattern.interval)
        break
      case 'years':
        next.setFullYear(next.getFullYear() + pattern.interval)
        break
    }

    return next
  }

  /**
   * Generate future instances for recurring todos
   */
  static generateRecurringInstances(todo: Todo, count: number = 5): TodoInstance[] {
    if (!todo.isRecurring || !todo.recurringPattern) return []

    const instances: TodoInstance[] = []
    let currentDate = todo.dueDate || new Date()

    for (let i = 0; i < count; i++) {
      currentDate = this.calculateNextDueDate(todo.recurringPattern, currentDate)
      instances.push({
        id: uuidv4(),
        parentId: todo.id,
        scheduledDate: new Date(currentDate),
        status: 'scheduled'
      })
    }

    return instances
  }

  /**
   * Convert ParsedTodo to Todo with intelligent scheduling
   */
  static createTodoFromParsed(parsed: ParsedTodo): Todo {
    const todo: Todo = {
      id: uuidv4(),
      content: parsed.content,
      originalInput: parsed.content,
      priority: parsed.priority,
      status: 'pending',
      category: parsed.category,
      isRecurring: parsed.isRecurring,
      createdAt: new Date(),
      aiSuggestions: []
    }

    // Parse due date
    if (parsed.dueDate) {
      const parsedDate = this.parseRelativeDate(parsed.dueDate)
      if (parsedDate) {
        todo.dueDate = parsedDate
      }
    }

    // Handle recurring pattern
    if (parsed.isRecurring && parsed.recurringPattern) {
      const pattern = this.parseRecurringPattern(parsed.recurringPattern.description)
      if (pattern) {
        todo.recurringPattern = pattern
        if (todo.dueDate) {
          todo.recurringPattern.nextDueDate = this.calculateNextDueDate(pattern, todo.dueDate)
        }

        // Generate future instances
        todo.instances = this.generateRecurringInstances(todo, 5)
      }
    }

    return todo
  }

  /**
   * Handle rescheduling and propagation logic
   */
  static rescheduleRecurringTodo(
    todo: Todo,
    instanceId: string,
    newDate: Date,
    propagateToFuture: boolean = false
  ): Todo {
    if (!todo.instances) return todo

    const updatedTodo = { ...todo }
    const instanceIndex = updatedTodo.instances.findIndex(inst => inst.id === instanceId)

    if (instanceIndex === -1) return todo

    const instance = updatedTodo.instances[instanceIndex]
    const originalDate = instance.scheduledDate
    const timeDifference = newDate.getTime() - originalDate.getTime()

    // Update the specific instance
    updatedTodo.instances[instanceIndex] = {
      ...instance,
      scheduledDate: newDate,
      status: 'delayed',
      delayReason: `Rescheduled from ${originalDate.toLocaleDateString()}`
    }

    // Propagate to future instances if requested
    if (propagateToFuture) {
      for (let i = instanceIndex + 1; i < updatedTodo.instances.length; i++) {
        const futureInstance = updatedTodo.instances[i]
        updatedTodo.instances[i] = {
          ...futureInstance,
          scheduledDate: new Date(futureInstance.scheduledDate.getTime() + timeDifference)
        }
      }
    }

    return updatedTodo
  }
}