// The built-in facilitator tutorial, authored as a deck so it plays through the
// same full-screen presenter instructors use. Static slides only, so it needs
// no database and is always available at /tutorial.

import type { Slide } from "@/lib/deckTypes";

export const TUTORIAL_SLIDES: Slide[] = [
  { id: "t1", type: "title", title: "Welcome to Superadditive", subtitle: "The facilitator's guide. Get started in about ten minutes." },

  { id: "t2", type: "text", title: "What this is", body: "Superadditive runs real exercises with AI, grounded in actual academic frameworks. The AI interviews people, plays their counterpart, or simulates a result, and hands back something they can use. You can run these, build your own, and present them live to a room." },

  { id: "t3", type: "cards", title: "Four things you can do here", cards: [
    { icon: "▶️", heading: "Run modules", text: "AI-run exercises for strategy, research, negotiation, and career." },
    { icon: "🧩", heading: "Build modules", text: "Author your own interview-and-report module, no code." },
    { icon: "🖥️", heading: "Present live", text: "Slide decks with live word clouds, quizzes, and room photos." },
    { icon: "📊", heading: "Track your people", text: "See who is using it and what they finish." },
  ] },

  { id: "t4", type: "text", body: "Everything lives in the account menu, top-right of every screen. That is your home base for all of it." },

  { id: "t5", type: "section", title: "1. The module library" },
  { id: "t6", type: "cards", title: "What the library covers", cards: [
    { icon: "💼", heading: "Work & AI", text: "Redesign a job or workflow around AI." },
    { icon: "🎯", heading: "Sharpen a decision", text: "Pressure-test a strategy or a bet with real numbers." },
    { icon: "🔬", heading: "Research & scholarship", text: "Frame ideas, design experiments, read your regressions." },
    { icon: "🎓", heading: "The PhD path", text: "From deciding on a PhD to landing an academic job." },
    { icon: "🤖", heading: "How AI works", text: "A plain-language series on what AI can and cannot do." },
    { icon: "🤝", heading: "Negotiate & run live", text: "Bargain against an AI, or run whole-room activities." },
  ] },
  { id: "t7", type: "cards", title: "The shape of every module", cards: [
    { icon: "1", heading: "Setup", text: "Name what you are working on." },
    { icon: "2", heading: "AI interview", text: "The AI asks about your real situation." },
    { icon: "3", heading: "Report", text: "It builds an analysis from your own answers." },
    { icon: "4", heading: "Credential", text: "Finish a bundle, earn a shareable certificate." },
  ] },
  { id: "t8", type: "text", title: "Try one yourself first", body: "The fastest way to understand Superadditive is to run a module. From the dashboard, pick one that fits you and go. It takes twenty minutes and you leave with something real." },

  { id: "t9", type: "section", title: "2. Build your own modules" },
  { id: "t10", type: "bullets", title: "No code, from the menu", bullets: [
    "Account menu, then Build a module.",
    "Pick a type: Report, Scorecard, or Verdict.",
    "Say who the AI should be and what it should ask.",
    "List the report sections. The AI writes them from the interview.",
    "Publish to your organization, or (superadmin) to everyone.",
  ] },
  { id: "t11", type: "text", body: "You never write a prompt. You describe the interview and the report in plain words, and the app compiles a safe, runnable module. It stays on task and refuses anything off-topic or harmful." },

  { id: "t12", type: "section", title: "3. Presentations" },
  { id: "t13", type: "cards", title: "A deck can hold", cards: [
    { icon: "📝", heading: "Static slides", text: "Title, section, bullets, text, quote, image, cards." },
    { icon: "☁️", heading: "Live word cloud", text: "The room submits phrases; they appear with an AI summary." },
    { icon: "📷", heading: "Room photo + AI", text: "The room adds photos; AI reacts on the slide." },
    { icon: "🧠", heading: "Live quiz", text: "Your questions, scored live against the room." },
  ] },
  { id: "t14", type: "bullets", title: "Build and present", bullets: [
    "Account menu, then Presentations, then New.",
    "Add slides, reorder them, edit each one.",
    "Save. Live activities get their join codes automatically.",
    "Present full-screen. Use the arrow keys to move.",
  ] },
  { id: "t15", type: "text", title: "How the room joins", body: "When you present a live activity slide, a join code and QR appear on screen. Your audience opens it on their phones, and their responses show up live. No sign-in, no setup for them." },

  { id: "t16", type: "section", title: "4. Running it live in class" },
  { id: "t17", type: "cards", title: "A simple flow", cards: [
    { icon: "1", heading: "Prepare", text: "Build a deck, or pick a live activity or module." },
    { icon: "2", heading: "Share", text: "Show the join code or send the link." },
    { icon: "3", heading: "Present", text: "Go full-screen and walk the room through it." },
    { icon: "4", heading: "Debrief", text: "Use the AI summary to lead the discussion." },
  ] },

  { id: "t18", type: "section", title: "5. Credentials & progress" },
  { id: "t19", type: "bullets", title: "Earned, not given", bullets: [
    "Learners earn a certificate by completing a bundle of modules.",
    "Certificates are shareable straight to LinkedIn.",
    "Progress and achievements live in each person's account.",
  ] },

  { id: "t20", type: "section", title: "6. Admin & usage" },
  { id: "t21", type: "cards", title: "Where to look", cards: [
    { icon: "🏢", heading: "Your organization", text: "Usage and certificates for your own members." },
    { icon: "🛠️", heading: "Platform admin", text: "Usage, AI spend, organizations (superadmin)." },
    { icon: "🔒", heading: "Scoped by role", text: "Directors see only their org; superadmin sees everyone." },
  ] },

  { id: "t22", type: "section", title: "Get started" },
  { id: "t23", type: "cards", title: "Your first four moves", cards: [
    { icon: "▶️", heading: "Run a module", text: "Feel what your people will feel." },
    { icon: "🧩", heading: "Build a module", text: "Turn one of your frameworks into an exercise." },
    { icon: "🖥️", heading: "Make a deck", text: "Add one live word cloud to a few slides." },
    { icon: "🤝", heading: "Present it", text: "Run it with your group and debrief." },
  ] },
  { id: "t24", type: "quote", quote: "You bring the judgment. The AI runs the room.", attribution: "Everything starts from the account menu, top-right." },
];
