# Exam Results Database Schema

## Overview
This schema tracks exam attempts and detailed question-by-question responses for in-depth analysis.

## Tables

### `results`
Stores overall exam attempt results for each user and module.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | TEXT | Whop user ID who took the exam |
| `module_id` | UUID | Reference to the module |
| `score` | NUMERIC | Percentage score (0-100) |
| `total_questions` | INTEGER | Total number of questions in the exam |
| `correct_answers` | INTEGER | Number of correct answers |
| `submitted_at` | TIMESTAMPTZ | When the exam was submitted |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

### `exam_answers`
Stores individual question responses for detailed analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `result_id` | UUID | Reference to the results record |
| `exercise_id` | UUID | Reference to the question |
| `selected_alternative_id` | UUID | Reference to the selected answer |
| `is_correct` | BOOLEAN | Whether the answer was correct |
| `time_spent_seconds` | INTEGER | Time spent on this question |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

## Setup Instructions

1. **Run the SQL schema**:
   ```bash
   # In Supabase SQL Editor, run:
   quiz/supabase-results-schema.sql
   ```

2. **Verify tables created**:
   - Check that both `results` and `exam_answers` tables exist
   - Verify indexes are created for performance
   - Check foreign key relationships

## Usage

### Server Actions (`app/actions/results.ts`)

- `saveExamResult()` - Save a complete exam attempt with all answers
- `getResultsByUser()` - Get all results for a specific user
- `getResultsByModule()` - Get all results for a specific module
- `getExamAnswers()` - Get detailed answers for a specific result
- `getResultWithAnswers()` - Get a result with all details (joins exercises and alternatives)

### Example: Save Exam Results

```typescript
import { saveExamResult } from "@/app/actions/results"

const result = await saveExamResult(
  userId,
  moduleId,
  85.5, // score percentage
  10, // total questions
  9, // correct answers
  [
    {
      exerciseId: "exercise-uuid-1",
      selectedAlternativeId: "alternative-uuid-1",
      isCorrect: true,
      timeSpentSeconds: 15
    },
    // ... more answers
  ]
)
```

### Example: Get User's Exam History

```typescript
import { getResultsByUser } from "@/app/actions/results"

const results = await getResultsByUser(userId)
// Returns array of all exam attempts by this user
```

### Example: Analyze Exam Performance

```typescript
import { getResultWithAnswers } from "@/app/actions/results"

const { data } = await getResultWithAnswers(resultId)
// Returns:
// - result: overall exam data
// - answers: array of detailed answers with question and alternative info
```

## Data Analysis Possibilities

With this schema, you can:

1. **Track individual performance**:
   - User's score history over time
   - Time spent per question
   - Most commonly missed questions

2. **Analyze question difficulty**:
   - Which questions have lowest success rate
   - Average time spent per question
   - Common wrong answers

3. **Module insights**:
   - Average scores per module
   - Completion rates
   - Performance trends

4. **Identify patterns**:
   - Questions that take longest to answer
   - Correlation between time spent and correctness
   - User learning curves over multiple attempts

## Security Notes

- Uses Supabase RLS (Row Level Security) - configure policies based on your needs
- User IDs from Whop authentication system
- All foreign keys have ON DELETE CASCADE for data integrity

