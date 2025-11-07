# Module System Documentation

This document describes the complete module management system with Supabase integration.

## Architecture Overview

The module system follows a clean, modular architecture:

```
┌─────────────────────────────────────────┐
│         Dashboard Page                  │
│  (Server Component - fetches data)      │
└─────────────┬───────────────────────────┘
              │
              ├─► DashboardNavbar (Company name + Theme)
              │
              └─► ModulesSection (Server Component)
                    │
                    ├─► AddModuleDialog (Client - Modal)
                    │     └─► createModule (Server Action)
                    │
                    └─► ModuleCard[] (Client - Display)
                          └─► deleteModule (Server Action)
```

## Components

### 1. Server Actions (`app/actions/modules.ts`)

**Functions:**
- `createModule(companyId, title, description)` - Creates a new module
- `getModules(companyId)` - Fetches all modules for a company
- `deleteModule(moduleId, companyId)` - Deletes a module

**Features:**
- Automatic order management (incremental)
- Path revalidation after mutations
- Error handling and logging
- Type-safe with TypeScript

### 2. AddModuleDialog (`components/add-module-dialog.tsx`)

A client-side modal dialog for creating new modules.

**Props:**
- `companyId: string` - The company ID to associate the module with

**Features:**
- Form validation (title required)
- Loading states
- Error handling with user feedback
- Auto-refresh after successful creation
- Clean form reset on close

**Fields:**
- **Title** (required) - Module name
- **Description** (optional) - Module description

### 3. ModuleCard (`components/module-card.tsx`)

Displays a single module as a card with actions.

**Props:**
- `module: Module` - The module data
- `companyId: string` - The company ID for authorization

**Features:**
- Hover effects for better UX
- Dropdown menu with actions
- Delete confirmation dialog
- Created date display
- Responsive design

**Actions:**
- Delete (with confirmation)

### 4. ModulesSection (`components/modules-section.tsx`)

Server component that fetches and displays all modules.

**Props:**
- `companyId: string` - The company ID to fetch modules for

**Features:**
- Grid layout (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- Empty state with helpful message
- Server-side data fetching
- Automatic updates via router.refresh()

## Database Schema

The `modules` table structure:

```sql
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for company queries
CREATE INDEX idx_modules_company_id ON modules(company_id);
```

## Data Flow

### Creating a Module

1. User clicks "Add Module" button
2. Dialog opens with form
3. User fills in title (required) and description (optional)
4. User clicks "Create Module"
5. `createModule` server action is called
6. Module is inserted into Supabase
7. Order number is automatically calculated
8. Path is revalidated
9. Router refreshes to show new module
10. Dialog closes and form resets

### Displaying Modules

1. Dashboard page loads
2. `ModulesSection` server component fetches modules via `getModules`
3. Modules are sorted by order
4. Each module is rendered as a `ModuleCard`
5. Grid layout adjusts to screen size

### Deleting a Module

1. User hovers over module card
2. Menu icon appears
3. User clicks menu → Delete
4. Confirmation dialog appears
5. User confirms deletion
6. `deleteModule` server action is called
7. Module is removed from database
8. Path is revalidated
9. Router refreshes to update UI

## Environment Variables Required

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage Example

The system is already integrated into the dashboard. To use it:

1. Navigate to `/dashboard/[companyId]`
2. Click "Add Module" to create a new module
3. Fill in the form and submit
4. View your module in the grid
5. Hover over a module and click the menu to delete

## Future Enhancements

Potential features to add:

- [ ] Edit module functionality
- [ ] Reorder modules with drag-and-drop
- [ ] Module templates
- [ ] Bulk actions (delete multiple)
- [ ] Search/filter modules
- [ ] Module statistics (exercise count, completion rate)
- [ ] Duplicate module functionality
- [ ] Export/import modules

## Error Handling

The system includes comprehensive error handling:

- Form validation (client-side)
- Database errors (caught and logged)
- User-friendly error messages
- Loading states during operations
- Confirmation dialogs for destructive actions

## Performance Considerations

- Server components fetch data on the server (no client-side waterfalls)
- Optimistic UI updates with router.refresh()
- Indexed database queries for fast lookups
- Automatic path revalidation for fresh data
- Minimal client-side JavaScript

## Security

- Company ID is validated in server actions
- Row-level security can be added in Supabase
- All mutations go through server actions (not exposed to client)
- CSRF protection via Next.js

