# Intelligent Vault: AI-Powered Research Tracker

A professional, minimal bookmark manager that uses **Gemini AI** to automatically summarize and categorize your saved links in real-time. Built for the Abstrabit Technologies Micro-Challenge.

## 🚀 Key Features

- **Google OAuth**: Secure, seamless sign-in.
- **AI Enrichment**: Every link is automatically analyzed by Gemini to generate a concise summary and category tag.
- **Real-time Sync**: Instant updates across all open tabs using Supabase Realtime (INSERT/UPDATE/DELETE).
- **Hardened Privacy**: Database-level security via Row Level Security (RLS) policies.
- **Premium UI**: Minimalist, high-performance interface built with Tailwind CSS.

## 🛠️ Infrastructure

- **Frontend**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI Engine**: Google Gemini API
- **Real-time**: Supabase Broadcast & DB Listeners
- **Auth**: Supabase Googl OAuth

## 🧠 Problem Solving Journey

### The Challenge: Seamless AI UX
Integrating an AI LLM into a real-time application often creates "loading anxiety" for users. If I waited for the AI to finish before showing the bookmark, the app would feel slow.

### The Solution: "Optimistic Enrichment"
I implemented a dual-flow system:
1. **Instant UI**: When a user saves a link, it is immediately inserted into the database and reflected in the UI via Realtime subscriptions.
2. **Background Enrichment**: After the insertion, the frontend triggers a headless API route (`/api/ai/enrich`). The UI displays an "Enriching..." animation while the AI works. Once the database is updated with the AI's results, a secondary Realtime **UPDATE** event refreshes the specific card with the new summary and category—no page refresh needed.

## 🛠️ Setup Instructions

1. **Clone & Install**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://kgmaudrexzjyswhcwlgn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_KEY
   GEMINI_API_KEY=YOUR_GEMINI_KEY
   GEMINI_MODEL=gemini-2.0-flash
   ```
3. **Database Setup**:
   Run the SQL provided in `supabase/schema.sql` within your Supabase SQL Editor.
4. **Run Dev**:
   ```bash
   npm run dev
   ```

## 📚 Deep Dive

For detailed architecture diagrams, interview Q&A, and technical implementation details, see [docs/DEEP_DIVE.md](file:///d:/Projects/abstractcompany/docs/DEEP_DIVE.md).
