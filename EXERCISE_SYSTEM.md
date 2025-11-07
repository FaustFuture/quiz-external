# Exercise System Documentation

This document describes the complete exercise management system with navigation and weight-based scoring.

## Architecture Overview

The exercise system follows a card-based navigation pattern:

```
Module Detail Page
├─ AddExerciseDialog (Modal)
├─ ExerciseCard (Navigation Component)
│  ├─ Previous/Next Arrows
│  ├─ Exercise Content (2:1 aspect ratio)
│  └─ Actions Menu (Edit/Delete)
└─ Server Actions (CRUD operations)
```

## Components

### 1. Server Actions (`app/actions/exercises.ts`)

**Functions:**
- `createExercise(moduleId, question, imageUrl, weight)` - Creates a new exercise
- `getExercises(moduleId)` - Fetches all exercises for a module
- `updateExerciseOrder(exerciseId, newOrder, moduleId)` - Reorders exercises
- `deleteExercise(exerciseId, moduleId)` - Deletes an exercise

**Features:**
- Automatic order management (incremental)
- Path revalidation after mutations
- Error handling and logging
- Type-safe with TypeScript

### 2. AddExerciseDialog (`components/add-exercise-dialog.tsx`)

A modal dialog for creating new exercises.

**Props:**
- `moduleId: string` - The module ID to associate the exercise with

**Fields:**
- **Question** (required) - The exercise question/statement
- **Image URL** (optional) - URL to an image for the exercise
- **Weight** (default: 1) - Points value (1-10)

**Features:**
- Form validation (question required)
- Loading states
- Error handling with user feedback
- Auto-refresh after successful creation
- Clean form reset on close

### 3. ExerciseCard (`components/exercise-card.tsx`)

Displays a single exercise with navigation controls.

**Props:**
- `exercises: Exercise[]` - Array of all exercises
- `currentIndex: number` - Current exercise index
- `moduleId: string` - The module ID for operations

**Features:**
- **Navigation**: Left/Right arrows to move between exercises
- **Aspect Ratio**: 2:1 width-to-height ratio as requested
- **Weight Display**: Shows points value
- **Image Support**: Displays images with error handling
- **Actions Menu**: Edit and delete options
- **Order Management**: Swaps exercise positions when navigating

### 4. Module Page Updates

The module detail page now includes:
- Exercise count in the header
- AddExerciseDialog integration
- ExerciseCard display with navigation
- Empty state when no exercises exist

## Weight System Design

### Recommended Weight Structure

The weight system is designed to reflect exercise difficulty and importance:

```
1 point  - Basic recall questions
2 points - Simple application
3 points - Moderate complexity
4 points - Multi-step problems
5 points - Complex scenarios
6-10 points - Advanced/challenge questions
```

### Implementation Details

- **Default Weight**: 1 point (accessible to all users)
- **Range**: 1-10 points (prevents extreme values)
- **Display**: Shows "X point(s)" with proper pluralization
- **Scoring**: Can be used for quiz scoring algorithms

## Navigation System

### Exercise Navigation

The card-based navigation allows users to:
1. **Move Left/Right**: Use arrow buttons to navigate between exercises
2. **Reorder**: Navigation automatically swaps exercise positions
3. **Visual Feedback**: Buttons disable when at boundaries
4. **Loading States**: Prevents multiple simultaneous operations

### Order Management

- Exercises are ordered by the `order` field
- Navigation swaps the `order` values between adjacent exercises
- This creates a natural reordering system
- Maintains consistent ordering across sessions

## UI/UX Features

### Card Design

- **Aspect Ratio**: 2:1 width-to-height as requested
- **Responsive**: Adapts to different screen sizes
- **Content Layout**: 
  - Header: Exercise number and weight
  - Body: Question text
  - Image: Optional image display
  - Footer: Creation date

### Navigation Controls

- **Arrow Buttons**: Left/Right chevron icons
- **Disabled States**: Grayed out at boundaries
- **Loading States**: Prevents clicks during operations
- **Visual Feedback**: Clear indication of available actions

### Image Handling

- **Optional Display**: Only shows if image URL provided
- **Error Handling**: Hides broken images gracefully
- **Responsive**: Images scale to fit container
- **Rounded Corners**: Consistent with design system

## Data Flow

### Creating an Exercise

1. User clicks "Add Exercise" button
2. Dialog opens with form
3. User fills in question (required), image URL (optional), weight (default: 1)
4. User clicks "Create Exercise"
5. `createExercise` server action is called
6. Exercise is inserted into Supabase with next order number
7. Path is revalidated
8. Router refreshes to show new exercise
9. Dialog closes and form resets

### Navigating Exercises

1. User clicks left/right arrow
2. `updateExerciseOrder` is called for both exercises
3. Order values are swapped
4. Path is revalidated
5. Router refreshes with new order
6. UI updates to show new current exercise

### Deleting an Exercise

1. User clicks menu → Delete
2. Confirmation dialog appears
3. User confirms deletion
4. `deleteExercise` server action is called
5. Exercise is removed from database
6. Path is revalidated
7. Router refreshes to update UI

## Database Schema

The `exercises` table structure:

```sql
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    image_url TEXT,
    weight INTEGER DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_exercises_module_id ON exercises(module_id);
CREATE INDEX idx_exercises_order ON exercises("order");
```

## Future Enhancements

Potential features to add:

- [ ] Exercise editing functionality
- [ ] Bulk operations (delete multiple)
- [ ] Exercise templates
- [ ] Rich text editor for questions
- [ ] Image upload (not just URLs)
- [ ] Exercise preview mode
- [ ] Duplicate exercise functionality
- [ ] Exercise categories/tags
- [ ] Time limits per exercise
- [ ] Difficulty levels

## Performance Considerations

- Server components fetch data on the server
- Optimistic UI updates with router.refresh()
- Indexed database queries for fast lookups
- Automatic path revalidation for fresh data
- Minimal client-side JavaScript
- Image lazy loading (browser default)

## Security

- Module ID is validated in server actions
- Row-level security can be added in Supabase
- All mutations go through server actions
- CSRF protection via Next.js
- Input validation on both client and server

## Error Handling

- Form validation (client-side)
- Database errors (caught and logged)
- User-friendly error messages
- Loading states during operations
- Confirmation dialogs for destructive actions
- Image error handling (graceful fallback)
