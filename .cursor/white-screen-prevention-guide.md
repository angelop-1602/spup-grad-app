# White Screen Prevention Guide

## Overview
White screens in React/Inertia applications are typically caused by JavaScript errors that prevent the component from rendering. This guide outlines common causes and prevention strategies.

## Common Causes

### 1. TypeScript/Compilation Errors
**Symptoms:**
- White screen on all pages
- Console shows compilation errors
- Build fails

**Common Issues:**
- Duplicate imports in Wayfinder-generated files
- Type mismatches (e.g., passing `number | ''` where `string` is expected)
- Missing imports
- Syntax errors

**Prevention:**
- Always run `npm run build` or check the terminal for compilation errors before testing
- Use TypeScript strict mode and fix all type errors immediately
- Never ignore linter errors
- Check Wayfinder-generated files for duplicate imports after running `php artisan wayfinder:generate`

**How to Check:**
```bash
# Check for TypeScript errors
npm run build

# Or in development
npm run dev
# Watch the terminal output for errors
```

### 2. Runtime JavaScript Errors
**Symptoms:**
- White screen on specific pages
- Console shows JavaScript errors
- Page loads but doesn't render

**Common Issues:**
- Accessing properties on `null` or `undefined`
- Calling methods on wrong types
- Missing error boundaries
- Incorrect hook usage (e.g., hooks called conditionally)

**Prevention:**
- Always use optional chaining (`?.`) when accessing nested properties
- Provide default values for props and data
- Use error boundaries for critical components
- Validate data before using it

**Example:**
```typescript
// ❌ BAD - Will crash if profile is null
const name = profile.first_name;

// ✅ GOOD - Safe access
const name = profile?.first_name || '';

// ✅ BETTER - With validation
if (!profile) {
    return <ErrorComponent />;
}
const name = profile.first_name;
```

### 3. Import Errors
**Symptoms:**
- White screen on pages using specific imports
- Console shows "Cannot find module" errors

**Common Issues:**
- Incorrect import paths
- Missing exports
- Circular dependencies
- Wayfinder route imports (default vs named exports)

**Prevention:**
- Always verify import paths match actual file locations
- Use TypeScript to catch import errors at compile time
- For Wayfinder routes, check if it's a default or named export:
  ```typescript
  // Default export
  import routes from '@/routes/index';
  
  // Named export
  import { route } from '@/routes';
  ```

**How to Check:**
```bash
# Check for import errors
npm run build
# Look for "Cannot find module" errors
```

### 4. Form/State Management Errors
**Symptoms:**
- White screen when submitting forms
- Errors related to `useForm` or `setData`

**Common Issues:**
- Passing wrong types to `setData`
- Using `Form.useForm` instead of `useForm`
- Not handling form state properly

**Prevention:**
- Always use `useForm` from `@inertiajs/react`, not `Form.useForm`
- Ensure types match when calling `setData`
- Convert types explicitly when needed:
  ```typescript
  // ❌ BAD - Type mismatch
  setData('department_id', deptId); // deptId is number | ''
  
  // ✅ GOOD - Explicit conversion
  setData('department_id', deptId ? String(deptId) : '');
  ```

### 5. Wayfinder-Generated File Issues
**Symptoms:**
- White screen after running `php artisan wayfinder:generate`
- Duplicate import errors

**Common Issues:**
- Duplicate import statements
- Incorrect import paths
- Missing exports

**Prevention:**
- After running `wayfinder:generate`, check generated files for duplicates
- Look for patterns like:
  ```typescript
  // ❌ BAD - Duplicate
  import { queryParams } from './wayfinder'
  import { queryParams } from './wayfinder'
  
  // ✅ GOOD - Single import
  import { queryParams } from './wayfinder'
  ```

**How to Fix:**
1. Search for duplicate imports: `grep -r "queryParams.*queryParams" resources/js/routes/`
2. Remove duplicate lines
3. Rebuild: `npm run build`

## Debugging Checklist

When you encounter a white screen, follow this checklist:

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Look for:
   - Red error messages
   - Stack traces
   - "Cannot find module" errors
   - Type errors

### Step 2: Check Terminal/Build Output
1. Check the terminal where `npm run dev` is running
2. Look for:
   - Compilation errors
   - TypeScript errors
   - Build failures

### Step 3: Check Network Tab
1. Open Network tab in DevTools
2. Check if JavaScript files are loading
3. Look for 404 errors or failed requests

### Step 4: Check Specific Files
1. Check the page component file for syntax errors
2. Check imports and exports
3. Check for type errors
4. Verify Wayfinder-generated files if route-related

### Step 5: Use Error Boundaries
Add error boundaries to catch and display errors:
```typescript
// In your layout or app component
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Wrap your app
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <YourApp />
</ErrorBoundary>
```

## Prevention Best Practices

### 1. Always Run Linter Before Committing
```bash
# Check for linting errors
npm run lint

# Or use your IDE's linting feature
```

### 2. Use TypeScript Strictly
- Enable strict mode in `tsconfig.json`
- Fix all type errors immediately
- Don't use `any` types unless absolutely necessary

### 3. Test After Every Change
- After making changes, test the affected pages
- Check browser console for errors
- Verify the page renders correctly

### 4. Use Development Tools
- Keep browser DevTools open while developing
- Monitor console for warnings and errors
- Use React DevTools for component debugging

### 5. Validate Data Before Use
```typescript
// Always validate props and data
interface Props {
  profile: StudentProfile | null;
  departments: Department[];
}

export default function Component({ profile, departments }: Props) {
  // Validate early
  if (!profile) {
    return <ErrorComponent message="Profile not found" />;
  }
  
  if (!departments || departments.length === 0) {
    return <ErrorComponent message="No departments available" />;
  }
  
  // Safe to use profile and departments here
  return <div>...</div>;
}
```

### 6. Handle Wayfinder Route Imports Carefully
```typescript
// Check the generated file to see export type
// Default export:
import routes from '@/routes/index';
routes.dashboard().url

// Named export:
import { dashboard } from '@/routes';
dashboard().url
```

### 7. Use Optional Chaining and Nullish Coalescing
```typescript
// Safe property access
const name = profile?.first_name ?? 'Unknown';
const department = departments?.find(d => d.id === id) ?? null;

// Safe method calls
const result = data?.map(item => item.name) ?? [];
```

### 8. Initialize State Properly
```typescript
// Always provide default values
const [value, setValue] = useState<string>('');
const [count, setCount] = useState<number>(0);
const [items, setItems] = useState<Item[]>([]);
```

## Quick Fix Commands

When you encounter a white screen, try these in order:

```bash
# 1. Check for compilation errors
npm run build

# 2. Check for duplicate imports in Wayfinder files
grep -r "queryParams.*queryParams" resources/js/routes/

# 3. Regenerate Wayfinder routes (may fix import issues)
php artisan wayfinder:generate

# 4. Clear build cache and rebuild
rm -rf node_modules/.vite
npm run build

# 5. Check for TypeScript errors
npx tsc --noEmit
```

## Common Patterns to Avoid

### ❌ Don't Do This:
```typescript
// Accessing properties without checking
const name = profile.first_name;

// Using wrong hook
const { data } = Form.useForm({...});

// Type mismatch
setData('id', numberValue); // when id expects string

// Conditional hooks
if (condition) {
  const [state, setState] = useState(); // ❌
}
```

### ✅ Do This Instead:
```typescript
// Safe property access
const name = profile?.first_name ?? '';

// Correct hook usage
const { data } = useForm({...});

// Type conversion
setData('id', String(numberValue));

// Hooks at top level
const [state, setState] = useState(); // ✅
if (condition) {
  // use state here
}
```

## Emergency Recovery

If all pages are white screens:

1. **Check the last file you edited** - Most likely the cause
2. **Revert recent changes** - Use git to undo problematic commits
3. **Check Wayfinder files** - Look for duplicate imports
4. **Check app.tsx** - Ensure main entry point is correct
5. **Clear cache and rebuild**:
   ```bash
   rm -rf node_modules/.vite
   npm run build
   ```

## Summary

White screens are almost always caused by:
1. **Compilation errors** (TypeScript/build failures)
2. **Runtime errors** (null/undefined access, type mismatches)
3. **Import errors** (missing modules, wrong paths)
4. **Wayfinder issues** (duplicate imports, wrong export types)

**Golden Rule:** Always check the browser console and terminal output when you see a white screen. The error message will tell you exactly what's wrong.

