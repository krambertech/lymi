# Lymi: high-level product brief

**Status:** Early draft, direction only. Everything here is changeable. **Initial release:** Private, single-user web app **Potential future:** Product for other language learners

This is the original brief, lightly edited. PRODUCT.md and DESIGN.md at the repo root carry the decisions made since.

## Overview

A vocabulary-learning app for collecting words and phrases from language lessons and remembering them through spaced repetition. The initial version is for one person. It should leave room to become a multi-user product later without assuming a public launch will happen.

## Problem

Existing vocabulary and flashcard products compromise in at least one area. The product is capable but unpleasant. The interface is attractive but vocabulary cannot be added programmatically. AI can generate cards but the result feels generic or untrustworthy. Mobile and web are inconsistent.

The opportunity is a high-quality learning experience plus an easy way to turn lesson material into personal vocabulary.

## Initial user

Takes language lessons. Collects new words and phrases from lesson notes or transcripts. Reviews on desktop and phone. Wants AI to reduce the manual work. Values a considered, enjoyable interface.

## Product goals

- Make it easy to collect useful words and phrases from lessons.
- Help the learner remember them through spaced repetition.
- Make reviewing pleasant enough to become a habit.
- Work well on desktop and mobile web.
- Let AI tools add and manage vocabulary through supported integrations.
- Give the learner control over AI-generated content.
- Keep vocabulary portable and recoverable.

## Initial scope

### Private access
Only the initial user can sign in. No public registration. Additional accounts can come later.

### Progressive web app
Responsive, installable, core review works at desktop and mobile sizes, sensible offline behaviour for review.

### Decks
Create and manage decks. Add, edit, move, archive and restore vocabulary. Browse and search. See progress within a deck. Import and export. Hierarchy and organisation model are open.

### Vocabulary
Words and phrases with enough context to be useful: the term, meaning or translation, pronunciation, example usage, grammar notes, source lesson, tags. Final structure to be determined through prototyping.

### AI-assisted preparation
The learner provides lesson material. AI identifies and prepares candidate entries. The learner reviews and edits before adding. The product avoids duplicates and low-quality entries. AI-generated information is distinguishable from lesson-sourced information.

### Spaced repetition
FSRS or another validated modern algorithm. The learner grades recall. Scheduling adapts to history. History is retained. Different recall directions are supported where useful.

### API
Documented, authenticated, scoped API for core vocabulary and deck operations. Integrations cannot bypass product rules. API changes are visible and auditable in the product.

### MCP
Authenticated MCP server. AI clients can discover decks and context, and propose or add vocabulary within the learner's permissions. Protection against unintended, duplicate or destructive changes.

## Experience requirements

Distinctive identity rather than a default component library. Calm, focused, appropriate for daily use. Common actions quick. Desktop and mobile each considered. Accessibility is part of the quality bar. Typography matters because words are the content. Shadcn is the initial component foundation but should not determine the final identity.

Update since the brief: light theme is the default and dark theme ships alongside it. The name is Lymi and the symbol is a storm lantern. See DESIGN.md.

## Best-in-class qualities to explore

Fast capture of a single word. Efficient review of a whole lesson. Clear approval of AI suggestions. Strong search and organisation. Pronunciation and audio. Recognition and production practice. Review continuity across devices. Offline behaviour. Easy correction of weak cards. Duplicate protection. Reversible actions. Keyboard-efficient desktop. Comfortable mobile. Complete export. Progress without intrusive gamification.

## Success indicators for the private version

The user chooses Lymi for regular review. Adding vocabulary after a lesson takes much less manual effort. AI suggestions are useful and easy to inspect. Review is comfortable on desktop and phone. Data and progress are reliable across sessions and devices. The visual direction is worth developing further.

## Out of scope for now

Public launch, payments, social features, shared or public decks, a marketplace, classroom features, a built-in course, native mobile apps. [Shared decks](proposals/shared-decks.md) are documented as a future exploration; this does not change the initial scope.

## Open questions

- Which language or language pair first?
- What lesson material should the first AI workflow accept?
- What makes a vocabulary entry genuinely useful?
- How should recall directions work?
- What should a daily review feel like?
- How much offline is needed initially?
- Which AI client tests MCP first?
- What would need to be true before inviting other users?
