# Logo Persistence Fix

## 🐛 **The Problem**

Logo would upload successfully but **disappear after page refresh**.

## 🔍 **Root Cause**

The `getCompany()` function was using the **wrong Supabase client**:

```typescript
// ❌ BEFORE - Using regular client (blocked by RLS)
const { data, error } = await supabase
  .from("companies")
  .select("*")
  .eq("id", companyId)
  .single()
```

This meant:
1. ✅ Logo uploaded successfully to storage
2. ✅ Database updated with new `logo_url`
3. ✅ Local state updated immediately
4. ❌ But on page refresh, `getCompany()` couldn't read the updated data (RLS blocked it)
5. ❌ So component initialized with `null` logo URL

## ✅ **The Fixes**

### Fix 1: Use Admin Client in `getCompany()`

```typescript
// ✅ AFTER - Using admin client (bypasses RLS)
const { data, error } = await supabaseAdmin
  .from("companies")
  .select("*")
  .eq("id", companyId)
  .single()
```

**File**: `app/actions/company.ts` (line 27)

### Fix 2: Add Logging for Debugging

Added console logs to track:
- When company data is fetched
- What logo URL is retrieved
- Any errors that occur

```typescript
console.log("[getCompany] Company data retrieved:", data?.name, "Logo URL:", data?.logo_url)
```

### Fix 3: Sync State with Props

Added `useEffect` in `DashboardWithToggle` to sync local state when server data changes:

```typescript
useEffect(() => {
  console.log('[DashboardWithToggle] Company data changed:', companyData?.logo_url)
  if (companyData?.logo_url !== logoUrl) {
    setLogoUrl(companyData?.logo_url || null)
  }
}, [companyData?.logo_url])
```

**File**: `components/dashboard-with-toggle.tsx` (lines 40-45)

## 🎯 **What This Fixes**

| Before | After |
|--------|-------|
| Logo disappears on refresh | Logo persists ✅ |
| RLS blocks company data | Admin client bypasses RLS ✅ |
| No visibility into issues | Debug logs show what's happening ✅ |
| State doesn't sync | useEffect syncs with server data ✅ |

## 🧪 **Testing**

1. **Upload a logo**:
   - Click the camera icon in the header
   - Upload an image
   - Should see success toast
   - Logo appears immediately

2. **Refresh the page**:
   - Press F5 or Ctrl+R
   - Logo should **still be visible** ✅

3. **Check terminal logs**:
   ```
   [getCompany] Fetching company data for: test-company
   [getCompany] Company data retrieved: Test Company Logo URL: https://...
   [DashboardWithToggle] Company data changed: https://...
   ```

4. **Check browser console**:
   ```
   [DashboardWithToggle] Company data changed: https://...
   ```

## 📊 **Data Flow**

### Before (Broken):
```
Upload → Storage ✅ → Database ✅ → Local State ✅
  ↓ Page Refresh
getCompany() → RLS BLOCKED ❌ → null logo_url → Logo Disappears ❌
```

### After (Fixed):
```
Upload → Storage ✅ → Database ✅ → Local State ✅
  ↓ Page Refresh
getCompany() → Admin Client ✅ → logo_url retrieved ✅ → Logo Persists ✅
```

## 🔧 **Files Modified**

1. **`app/actions/company.ts`**
   - Changed `getCompany()` to use `supabaseAdmin`
   - Added debug logging

2. **`components/dashboard-with-toggle.tsx`**
   - Added `useEffect` to sync logo state
   - Added debug logging

## 🎉 **Result**

Logo now **persists permanently** after upload, even across:
- ✅ Page refreshes
- ✅ Browser restarts  
- ✅ Different sessions
- ✅ Multiple users viewing

## 🔍 **Why This Pattern Matters**

This is the **same issue** we fixed with `getRecentResults`:

| Function | Before | After |
|----------|--------|-------|
| `getRecentResults()` | `supabase` ❌ | `supabaseAdmin` ✅ |
| `getCompany()` | `supabase` ❌ | `supabaseAdmin` ✅ |
| `getModules()` | `supabaseAdmin` ✅ | (already correct) |

**Pattern**: Server actions that fetch data for **admin dashboards** should use `supabaseAdmin` to bypass RLS.

## 💡 **Future Prevention**

To prevent similar issues:

1. **Use `supabaseAdmin` for all admin-side data fetching**
2. **Use `supabase` (or user-specific client) only for user-specific queries**
3. **Add console logging for critical data fetches**
4. **Test with page refreshes, not just live updates**

