# Code Style & Conventions

## TypeScript Configuration
- **Strict mode enabled** - Full TypeScript strict checking
- **ES2017 target** - Modern JavaScript features
- **Path mapping** - `@/*` maps to `src/*`
- **Module resolution** - Bundler mode for Next.js

## Code Style
- **File naming:** kebab-case for files, PascalCase for components
- **Function naming:** camelCase for functions, PascalCase for React components
- **Import style:** Absolute imports using `@/` alias
- **Export style:** Named exports preferred, default for components

## React Patterns
- **Functional components** - No class components
- **Hooks-based** - React hooks for state management
- **TypeScript interfaces** - Properly typed props and state
- **Error boundaries** - Wrap components for error handling

## Component Structure
```typescript
// Standard component pattern
interface ComponentProps {
  // Props definition
}

export function ComponentName({ prop }: ComponentProps) {
  // Implementation
}
```

## API Patterns
- **Standardized responses** - Use `apiSuccess()` and `apiError()`
- **Zod validation** - All API endpoints validate input
- **NextAuth integration** - Protected routes use `auth()`
- **Error handling** - Consistent error codes and messages

## Database Conventions
- **Prisma models** - Follow schema naming conventions
- **Relationship handling** - Use proper Prisma includes/selects
- **Transaction usage** - For complex operations

## Styling Conventions
- **Tailwind classes** - Utility-first approach
- **Component variants** - Use CVA for button/badge variants
- **Theme system** - Use CSS variables for colors
- **Responsive design** - Mobile-first approach