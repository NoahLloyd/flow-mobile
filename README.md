# Flowmatic

A mobile productivity app built with React Native and Expo. Track focus sessions, manage tasks, log daily signals, capture notes, and build morning routines.

## Features

- **Focus Timer** -- Stopwatch and countdown modes with focus ratings
- **Task Management** -- Categorized tasks (day, week, future, etc.) with swipe actions
- **Daily Signals** -- Track habits and metrics (binary, scale, number types) with custom signal support
- **Morning Routine** -- Guided writing, gratitude, affirmations, breathwork, and visualization with auto-save
- **Quick Capture** -- Rapidly add tasks and notes with voice input support
- **Android Widgets** -- Home screen widgets for quick capture, signal toggles, and daily summary
- **Offline Support** -- Queued actions sync when connectivity returns

## Tech Stack

- [Expo](https://expo.dev) (SDK 55)
- [React Native](https://reactnative.dev) 0.83
- [Supabase](https://supabase.com) for auth and database
- [TanStack Query](https://tanstack.com/query) for data fetching
- [Zustand](https://zustand-demo.pmnd.rs) for auth state
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A Supabase project with the required tables (see below)

### Setup

```bash
npm install
npx expo start
```

### Supabase Tables

The app expects the following tables with RLS enabled:

- `profiles` -- user profiles and preferences
- `sessions` -- focus sessions
- `tasks` -- user tasks
- `writings` -- morning routine entries
- `signals` -- daily signal/habit tracking
- `notes` -- quick capture notes

All tables should have a `user_id` column with RLS policies restricting access to the authenticated user.

### Configuration

The Supabase URL and anon key are configured in `src/lib/supabase.ts`. To use your own Supabase project, update the values there.

## License

[MIT](LICENSE)
