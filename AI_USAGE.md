# AI_USAGE.md
This repository was completed with assistance from an AI tool.

## AI tools used
- **Notion AI (chat assistant)** — used as a guidance tool while building the take-home.

## How I used AI (and for what)
I used Notion AI primarily for:
- **Project scaffolding guidance**
  - Generated the scaffolding for the project.
- **API design brainstorming**
  - Had discussions around the shape of the requests and responses
- **Query pattern brainstorming**
  - Had disccussions around the queries I would use
- **Documentation**
  - Helped draft README structure.

## Suggestions accepted as-is
- High-level structure (routes → services → repos).
- Using `app.inject()` style HTTP integration tests (Fastify) for end-to-end behavior without binding ports.

## Suggestions modified
- **Summary endpoint filtering**
  - AI suggested optional filtering by status and party type for the summary endpoint. I believed that was necessary, because the aggregate data would be pushed into a dashboard that probably needs each chunk. This would be uneeded added functionality.

## Suggestions rejected
- Rejected suggestion to use offset and page based pagination, becacuse it doesn't scale as well as cursor.

## Things the AI got wrong / issues I had to correct
- **Scaffolding issues**
    - There were problems in the scaffolding at first that prevented the service from starting up, but I was able to correct it.

## Summary
Notion AI was used as a pair-programming assistant for architecture, query patterns, testing strategy, and documentation. All code was reviewed and integrated manually, and I made final decisions on API behavior and implementation details.