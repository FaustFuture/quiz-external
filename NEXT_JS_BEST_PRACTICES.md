# Next.js 16 Best Practices & Solutions for Quiz App

> **Generated**: ${new Date().toLocaleDateString()}
> **Source**: Official Next.js, @dnd-kit, TanStack Query, and Supabase documentation via Context7

## Table of Contents
1. [Real-time State Management](#1-real-time-state-management)
2. [Performance Optimization](#2-performance-optimization)
3. [Drag and Drop Implementation](#3-drag-and-drop-implementation)
4. [Real-time Updates & Component Communication](#4-real-time-updates--component-communication)

---

## 1. Real-time State Management in Next.js 16

### Key Concepts

#### Server Components vs Client Components
- **Server Components** (default): Execute on the server, can directly access databases, no client-side JavaScript bundle
- **Client Components** (`'use client'`): Enable interactivity with useState, useEffect, event handlers

```typescript
// Server Component (default) - fetches data on server
async function ServerComponent() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component - requires 'use client' directive
'use client';
import { useState } from 'react';

function ClientComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

#### Composition Pattern
Pass Server Components as children to Client Components:

```typescript
// Modal.tsx (Client Component)
'use client';
export default function Modal({ children }: { children: React.ReactNode }) {
  return <div className="modal">{children}</div>;
}

// Page.tsx (Server Component)
import Modal from './Modal';
import Cart from './Cart'; // Server Component

export default function Page() {
  return (
    <Modal>
      <Cart /> {/* Server Component passed as child */}
    </Modal>
  );
}
```

### Supabase Realtime Integration

#### Setting Up Realtime Subscriptions

**Important**: Database changes are disabled by default. Enable via Supabase Dashboard > Database > Replication.

```typescript
'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function RealtimeQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch
    const fetchQuizzes = async () => {
      const { data } = await supabase.from('quizzes').select('*');
      setQuizzes(data || []);
    };
    fetchQuizzes();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('quizzes-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'quizzes',
        },
        (payload) => {
          console.log('Change received!', payload);
          
          if (payload.eventType === 'INSERT') {
            setQuizzes(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setQuizzes(prev => prev.map(q => 
              q.id === payload.new.id ? payload.new : q
            ));
          } else if (payload.eventType === 'DELETE') {
            setQuizzes(prev => prev.filter(q => q.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <ul>
      {quizzes.map(quiz => <li key={quiz.id}>{quiz.title}</li>)}
    </ul>
  );
}
```

#### Subscribe to Multiple Tables

```javascript
const channel = supabase
  .channel('db-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'quizzes',
  }, (payload) => console.log('Quiz changed:', payload))
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'exercises',
  }, (payload) => console.log('Exercise added:', payload))
  .subscribe();
```

#### Broadcast for Cross-Tab Communication

```typescript
'use client';
import { useEffect } from 'react';

export function BroadcastComponent() {
  const supabase = createClientComponentClient();

  useEffect(() => {
    const channel = supabase.channel('room1');
    
    // Listen to broadcast
    channel.on('broadcast', { event: 'quiz-updated' }, (payload) => {
      console.log('Quiz updated in another tab:', payload);
      // Update UI accordingly
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Send broadcast
        channel.send({
          type: 'broadcast',
          event: 'quiz-updated',
          payload: { quizId: 123 },
        });
      }
    });

    return () => supabase.removeChannel(channel);
  }, []);
}
```

### State Management Patterns

#### Option 1: React Context for Global State

```typescript
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type QuizContextType = {
  quizzes: Quiz[];
  setQuizzes: (quizzes: Quiz[]) => void;
  updateQuiz: (id: string, updates: Partial<Quiz>) => void;
};

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const updateQuiz = (id: string, updates: Partial<Quiz>) => {
    setQuizzes(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  return (
    <QuizContext.Provider value={{ quizzes, setQuizzes, updateQuiz }}>
      {children}
    </QuizContext.Provider>
  );
}

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) throw new Error('useQuiz must be used within QuizProvider');
  return context;
};
```

#### Option 2: TanStack Query (Recommended)

```typescript
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useQuizzes() {
  const queryClient = useQueryClient();

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const { data } = await supabase.from('quizzes').select('*');
      return data;
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (newQuiz: Quiz) => {
      const { data } = await supabase
        .from('quizzes')
        .insert([newQuiz])
        .select()
        .single();
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  return { quizzes, isLoading, createQuiz: createQuizMutation.mutate };
}
```

### Optimistic Updates

```typescript
const updateQuizMutation = useMutation({
  mutationFn: async (updatedQuiz: Quiz) => {
    const { data } = await supabase
      .from('quizzes')
      .update(updatedQuiz)
      .eq('id', updatedQuiz.id)
      .select()
      .single();
    return data;
  },
  // When mutate is called:
  onMutate: async (newQuiz) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['quizzes'] });

    // Snapshot previous value
    const previousQuizzes = queryClient.getQueryData(['quizzes']);

    // Optimistically update
    queryClient.setQueryData(['quizzes'], (old: Quiz[]) =>
      old.map(q => q.id === newQuiz.id ? newQuiz : q)
    );

    return { previousQuizzes };
  },
  // If mutation fails, rollback
  onError: (err, newQuiz, context) => {
    queryClient.setQueryData(['quizzes'], context.previousQuizzes);
  },
  // Always refetch after error or success
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  },
});
```

---

## 2. Performance Optimization in Next.js 16

### Server vs Client Components Strategy

**General Rule**: Use Server Components by default, Client Components only when needed.

#### When to Use Server Components:
- Fetching data
- Accessing backend resources directly
- Keeping sensitive information on server (API keys, tokens)
- Large dependencies that don't need client-side JavaScript

#### When to Use Client Components:
- Event listeners (onClick, onChange, etc.)
- State (useState, useReducer)
- Lifecycle effects (useEffect)
- Browser-only APIs (localStorage, window, etc.)
- Custom hooks that depend on state/effects

### React Memoization

#### React.memo - Prevent Component Re-renders

```typescript
import { memo } from 'react';

// Only re-renders if props change
const OptionItem = memo(function OptionItem({ 
  option, 
  exerciseId 
}: { 
  option: Alternative; 
  exerciseId: string; 
}) {
  return (
    <div>
      <input value={option.text} readOnly />
    </div>
  );
});

export default OptionItem;
```

**When to use**: Components that receive the same props frequently but are expensive to render.

#### useMemo - Memoize Expensive Calculations

```typescript
import { useMemo } from 'react';

function QuizResults({ exercises }: { exercises: Exercise[] }) {
  // Only recalculates when exercises change
  const totalPoints = useMemo(() => {
    return exercises.reduce((sum, ex) => {
      return sum + ex.alternatives.filter(a => a.is_correct).length;
    }, 0);
  }, [exercises]);

  return <div>Total Points: {totalPoints}</div>;
}
```

**When to use**: Expensive calculations that don't need to run on every render.

#### useCallback - Memoize Functions

```typescript
import { useCallback } from 'react';

function ExerciseForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  // Function reference stays the same between renders
  const handleSubmit = useCallback((data: FormData) => {
    const exerciseData = {
      title: data.get('title'),
      description: data.get('description'),
    };
    onSubmit(exerciseData);
  }, [onSubmit]);

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**When to use**: Functions passed as props to memoized child components.

### Code Splitting & Lazy Loading

#### Dynamic Imports with next/dynamic

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const QuizEditor = dynamic(() => import('@/components/QuizEditor'), {
  loading: () => <div>Loading editor...</div>,
  ssr: false, // Disable server-side rendering if needed
});

export default function Page() {
  return (
    <div>
      <h1>Edit Quiz</h1>
      <QuizEditor />
    </div>
  );
}
```

#### Stream Server Components with Suspense

```typescript
import { Suspense } from 'react';

// Server Component that fetches data
async function Quizzes() {
  const quizzes = await getQuizzes(); // Don't await in parent
  return <ul>{quizzes.map(q => <li key={q.id}>{q.title}</li>)}</ul>;
}

export default function Page() {
  return (
    <div>
      <h1>Quizzes</h1>
      <Suspense fallback={<div>Loading quizzes...</div>}>
        <Quizzes />
      </Suspense>
    </div>
  );
}
```

### Database Query Optimization

#### Supabase Best Practices

```typescript
// ❌ BAD - Fetches all data then filters in JS
const { data } = await supabase.from('exercises').select('*');
const filtered = data.filter(ex => ex.quiz_id === quizId);

// ✅ GOOD - Filter on database side
const { data } = await supabase
  .from('exercises')
  .select('*')
  .eq('quiz_id', quizId);

// ✅ BETTER - Only select needed columns
const { data } = await supabase
  .from('exercises')
  .select('id, title, order')
  .eq('quiz_id', quizId)
  .order('order', { ascending: true });

// ✅ BEST - Use joins for related data
const { data } = await supabase
  .from('exercises')
  .select(`
    id,
    title,
    alternatives (
      id,
      text,
      is_correct,
      order
    )
  `)
  .eq('quiz_id', quizId)
  .order('order', { ascending: true });
```

#### Add Database Indexes

```sql
-- Speed up queries by quiz_id
CREATE INDEX idx_exercises_quiz_id ON exercises(quiz_id);

-- Speed up queries by exercise_id and order
CREATE INDEX idx_alternatives_exercise_id_order 
ON alternatives(exercise_id, order);

-- Compound index for common filter combinations
CREATE INDEX idx_quizzes_company_created 
ON quizzes(company_id, created_at DESC);
```

### Image Optimization

```typescript
import Image from 'next/image';

export function QuizThumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={300}
      height={200}
      placeholder="blur"
      blurDataURL="/placeholder.jpg"
      loading="lazy"
    />
  );
}
```

---

## 3. Drag and Drop Implementation

### @dnd-kit Setup

**Installation:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Basic Sortable List Implementation

```typescript
'use client';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

export function SortableList({ items: initialItems }: { items: Alternative[] }) {
  const [items, setItems] = useState(initialItems);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

### Sortable Item Component

```typescript
'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableItem({ id, item }: { id: string; item: Alternative }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border rounded-lg p-4"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div>{item.text}</div>
      </div>
    </div>
  );
}
```

### Persisting Order to Database

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAlternativeOrder } from '@/app/actions/alternatives';

export function SortableList({ items: initialItems, exerciseId }: Props) {
  const [items, setItems] = useState(initialItems);
  const router = useRouter();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // Update local state immediately (optimistic update)
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Persist to database
      try {
        const result = await updateAlternativeOrder(
          active.id as string,
          newIndex,
          exerciseId
        );

        if (!result.success) {
          console.error('Failed to update order:', result.error);
          // Revert on error
          setItems(items);
          alert('Failed to save new order. Please try again.');
        } else {
          // Refresh to ensure consistency
          router.refresh();
        }
      } catch (error) {
        console.error('Error updating order:', error);
        setItems(items);
        alert('An error occurred. Please try again.');
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {/* ... */}
    </DndContext>
  );
}
```

### Server Action for Order Update

```typescript
'use server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function updateAlternativeOrder(
  alternativeId: string,
  newOrder: number,
  exerciseId: string
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Temporarily set all orders to -1 to avoid unique constraint conflicts
    await supabase
      .from('alternatives')
      .update({ order: -1 })
      .eq('exercise_id', exerciseId);

    // Get all alternatives for this exercise
    const { data: allAlternatives } = await supabase
      .from('alternatives')
      .select('id, order')
      .eq('exercise_id', exerciseId)
      .order('order', { ascending: true });

    if (!allAlternatives) {
      return { success: false, error: 'No alternatives found' };
    }

    // Find the alternative being moved
    const oldIndex = allAlternatives.findIndex(alt => alt.id === alternativeId);
    if (oldIndex === -1) {
      return { success: false, error: 'Alternative not found' };
    }

    // Create new order array
    const newOrderArray = [...allAlternatives];
    const [movedAlternative] = newOrderArray.splice(oldIndex, 1);
    newOrderArray.splice(newOrder, 0, movedAlternative);

    // Update all alternatives with new sequential order
    for (let i = 0; i < newOrderArray.length; i++) {
      await supabase
        .from('alternatives')
        .update({ order: i })
        .eq('id', newOrderArray[i].id)
        .eq('exercise_id', exerciseId);
    }

    // Revalidate the page cache
    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, 'page');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating alternative order:', error);
    return { success: false, error: 'Failed to update alternative order' };
  }
}
```

### Custom Transitions

```typescript
const { transition } = useSortable({
  id: props.id,
  transition: {
    duration: 150, // milliseconds
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  },
});

// Or disable transitions completely
const { transition } = useSortable({
  id: props.id,
  transition: null,
});
```

---

## 4. Real-time Updates & Component Communication

### Cache Invalidation with Server Actions

#### revalidatePath - Invalidate Specific Routes

```typescript
'use server';
import { revalidatePath } from 'next/cache';

export async function createQuiz(formData: FormData) {
  // Create quiz in database
  await supabase.from('quizzes').insert([{ title: formData.get('title') }]);
  
  // Invalidate the quizzes list page
  revalidatePath('/dashboard/[companyId]/quizzes', 'page');
  
  // Or invalidate entire layout (all nested pages)
  revalidatePath('/dashboard/[companyId]', 'layout');
}
```

#### revalidateTag - Invalidate by Tag

```typescript
'use server';
import { revalidateTag } from 'next/cache';

// Tag data when fetching
export async function getQuizzes() {
  const { data } = await fetch('https://api.example.com/quizzes', {
    next: { tags: ['quizzes'] }
  });
  return data;
}

// Invalidate all data tagged with 'quizzes'
export async function createQuiz(formData: FormData) {
  await supabase.from('quizzes').insert([...]);
  
  // Stale-while-revalidate (recommended)
  revalidateTag('quizzes', 'max');
}
```

#### updateTag - Immediate Expiration (Read-Your-Own-Writes)

```typescript
'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title'),
      content: formData.get('content'),
    },
  });

  // Immediately expire cache so new post is visible
  updateTag('posts');
  updateTag(`post-${post.id}`);

  // User will see the new post immediately
  redirect(`/posts/${post.id}`);
}
```

### router.refresh() for Client-Side Updates

```typescript
'use client';
import { useRouter } from 'next/navigation';

export function QuizForm() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await createQuiz(formData);
    
    // Refresh the current route (re-fetches Server Components)
    router.refresh();
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pub/Sub Pattern with Supabase Realtime

#### Publisher (Any Client)

```typescript
'use client';
export function QuizEditor({ quizId }: { quizId: string }) {
  const supabase = createClientComponentClient();

  async function handleUpdate(updates: Partial<Quiz>) {
    // Update database
    await supabase.from('quizzes').update(updates).eq('id', quizId);
    
    // Broadcast to other clients
    const channel = supabase.channel(`quiz-${quizId}`);
    await channel.send({
      type: 'broadcast',
      event: 'quiz-updated',
      payload: { quizId, updates },
    });
  }

  return <form onSubmit={handleUpdate}>...</form>;
}
```

#### Subscriber (All Other Clients)

```typescript
'use client';
export function QuizViewer({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const channel = supabase.channel(`quiz-${quizId}`);
    
    channel.on('broadcast', { event: 'quiz-updated' }, (payload) => {
      console.log('Quiz updated by another user:', payload);
      
      // Fetch fresh data or update state
      setQuiz(prev => ({ ...prev, ...payload.updates }));
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId, supabase]);

  return <div>{quiz?.title}</div>;
}
```

### TanStack Query with Supabase Realtime

```typescript
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useRealtimeQuizzes() {
  const queryClient = useQueryClient();
  const supabase = createClientComponentClient();

  // Query for quizzes
  const { data: quizzes } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const { data } = await supabase.from('quizzes').select('*');
      return data;
    },
  });

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('quizzes-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quizzes',
      }, () => {
        // Invalidate and refetch when changes occur
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  return { quizzes };
}
```

---

## Specific Recommendations for Quiz App

### Issue 1: Sidebar Filters Not Updating

**Problem**: New quizzes don't appear in sidebar filters without refresh.

**Solution**: Use Supabase Realtime or revalidatePath

#### Option A: Realtime Subscription (Recommended)

```typescript
'use client';
export function QuizSidebar() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch
    supabase.from('quizzes').select('*').then(({ data }) => {
      setQuizzes(data || []);
    });

    // Subscribe to changes
    const channel = supabase
      .channel('sidebar-quizzes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'quizzes',
      }, (payload) => {
        setQuizzes(prev => [...prev, payload.new as Quiz]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [supabase]);

  return (
    <aside>
      <h3>All Quizzes ({quizzes.length})</h3>
      {/* ... */}
    </aside>
  );
}
```

#### Option B: Invalidate After Creation

```typescript
'use server';
import { revalidatePath } from 'next/cache';

export async function createQuiz(formData: FormData) {
  const { data } = await supabase.from('quizzes').insert([...]).select();
  
  // Revalidate the dashboard layout (includes sidebar)
  revalidatePath('/dashboard/[companyId]', 'layout');
  
  return data;
}
```

### Issue 2: Drag & Drop Order Not Persisting

**Current Implementation Issues**:
1. Unique constraint conflicts when updating order
2. Missing error handling
3. No optimistic updates

**Fixed Implementation** (already shown above in Section 3)

Key improvements:
- Temporarily set orders to -1 to avoid conflicts
- Reorder all alternatives with sequential indexes
- Optimistic UI updates with rollback on error
- Proper revalidation

### Issue 3: Performance & Lag

**Optimizations**:

1. **Lazy Load Heavy Components**:
```typescript
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

2. **Memoize Expensive Renders**:
```typescript
const OptionsList = memo(function OptionsList({ options }: Props) {
  return options.map(option => <OptionItem key={option.id} option={option} />);
});
```

3. **Use Server Components for Data Fetching**:
```typescript
// Server Component - No client bundle, faster initial load
async function QuizList() {
  const quizzes = await getQuizzes();
  return <ul>{quizzes.map(q => <li key={q.id}>{q.title}</li>)}</ul>;
}
```

4. **Optimize Database Queries**:
```sql
-- Add indexes for common queries
CREATE INDEX idx_exercises_quiz_id ON exercises(quiz_id);
CREATE INDEX idx_alternatives_exercise_order ON alternatives(exercise_id, order);
```

5. **Debounce Input**:
```typescript
import { useDebouncedCallback } from 'use-debounce';

const handleSearch = useDebouncedCallback((value: string) => {
  // Perform search
}, 300);
```

### Issue 4: Component Syncing Across Windows

**Solution**: Use Supabase Broadcast

```typescript
'use client';
export function SyncedQuizEditor({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Subscribe to broadcasts from other windows
    const channel = supabase.channel(`quiz-${quizId}-sync`);
    
    channel.on('broadcast', { event: 'field-changed' }, (payload) => {
      console.log('Another window updated:', payload);
      setQuiz(prev => ({ ...prev, ...payload.changes }));
    }).subscribe();

    return () => supabase.removeChannel(channel);
  }, [quizId, supabase]);

  const handleFieldChange = async (field: string, value: any) => {
    // Update local state
    setQuiz(prev => ({ ...prev, [field]: value }));
    
    // Broadcast to other windows
    const channel = supabase.channel(`quiz-${quizId}-sync`);
    await channel.send({
      type: 'broadcast',
      event: 'field-changed',
      payload: { changes: { [field]: value } },
    });
  };

  return <form>...</form>;
}
```

---

## Official Documentation Links

- **Next.js 16**: https://nextjs.org/docs
- **@dnd-kit**: https://docs.dndkit.com/
- **TanStack Query v5**: https://tanstack.com/query/v5/docs
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **React 19 (Beta)**: https://react.dev/

---

## Quick Reference Checklist

### ✅ Real-time Updates
- [ ] Enable Supabase Realtime replication in Dashboard
- [ ] Set up channel subscriptions in Client Components
- [ ] Use `revalidatePath` in Server Actions after mutations
- [ ] Implement optimistic updates with rollback

### ✅ Performance
- [ ] Use Server Components by default
- [ ] Lazy load heavy components with `dynamic`
- [ ] Memoize expensive renders with `React.memo`
- [ ] Add database indexes for common queries
- [ ] Use `Suspense` for streaming

### ✅ Drag & Drop
- [ ] Set up @dnd-kit sensors and contexts
- [ ] Implement optimistic UI updates
- [ ] Persist order to database with proper conflict handling
- [ ] Revalidate cache after order changes

### ✅ Component Communication
- [ ] Use Supabase broadcast for cross-tab sync
- [ ] Implement TanStack Query for data fetching
- [ ] Use Context API for local state sharing
- [ ] Set up proper cleanup in `useEffect`


