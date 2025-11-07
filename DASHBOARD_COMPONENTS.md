# Dashboard Components Documentation

This document describes the modular dashboard components created for the quiz application.

## Component Structure

### 1. Theme System

#### `components/theme-provider.tsx`
A client-side theme provider that manages light/dark mode state and persists user preference to localStorage.

**Features:**
- Supports light, dark, and system themes
- Persists theme preference across sessions
- Automatically applies theme to document root

#### `components/theme-toggle.tsx`
A dropdown menu component for switching between themes.

**Features:**
- Icon-based toggle (Sun/Moon)
- Three options: Light, Dark, System
- Smooth transitions between themes

### 2. Navigation

#### `components/dashboard-navbar.tsx`
A clean, reusable navbar component for the dashboard.

**Props:**
- `companyName: string` - The name of the company to display

**Features:**
- Displays company name
- Theme toggle in the top-right
- Responsive layout
- Border bottom for visual separation

### 3. Content Sections

#### `components/modules-section.tsx`
A section component for displaying and managing quiz modules.

**Features:**
- "Modules" title with "Add Module" button
- Empty state with dashed border
- Placeholder for future module list
- Uses lucide-react icons

### 4. Page Layout

#### `app/dashboard/[companyId]/page.tsx`
The main dashboard page that combines all components.

**Features:**
- Fetches company data from Whop SDK
- Clean, minimal layout
- Modular component composition
- Full-height background

## Usage Example

```tsx
// The dashboard page automatically:
// 1. Verifies user authentication
// 2. Fetches company data
// 3. Renders navbar with company name and theme toggle
// 4. Displays modules section with add button
```

## Theme System Usage

The theme is managed globally via the `ThemeProvider` in `app/layout.tsx`:

```tsx
<ThemeProvider defaultTheme="system" storageKey="quiz-theme">
  <WhopApp>{children}</WhopApp>
</ThemeProvider>
```

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components for UI primitives
- CSS variables for theme colors
- Responsive design principles

## Next Steps

To extend the dashboard:

1. **Add Module Dialog**: Create a dialog component for adding new modules
2. **Module List**: Create a component to display existing modules
3. **Module Cards**: Design cards for each module with actions
4. **Supabase Integration**: Connect to Supabase to fetch/store modules

## Dependencies

- `@radix-ui/react-dropdown-menu` - Dropdown menu primitive
- `lucide-react` - Icon library
- `clsx` & `tailwind-merge` - Utility for conditional classes
- `@whop/sdk` - Whop platform integration

