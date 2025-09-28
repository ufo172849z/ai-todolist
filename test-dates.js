// Quick test for date parsing logic
const { SchedulingEngine } = require('./src/lib/scheduling.ts')

console.log('Current date:', new Date().toISOString())
console.log('Testing date parsing:')

const testCases = [
  'before summer',
  'by spring',
  'before winter',
  'by fall',
  'next week',
  'this weekend'
]

testCases.forEach(dateString => {
  try {
    const parsed = SchedulingEngine.parseRelativeDate(dateString)
    console.log(`"${dateString}" → ${parsed ? parsed.toDateString() : 'null'}`)
  } catch (error) {
    console.log(`"${dateString}" → ERROR: ${error.message}`)
  }
})