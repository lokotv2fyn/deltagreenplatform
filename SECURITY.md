# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please do **not** open a public GitHub issue.

Send a description of the issue to **kontakt@louisekoustrup.dk** with the subject line `[SECURITY] deltagreenplatform`.

Include:
- What the vulnerability is and where it exists
- Steps to reproduce
- Potential impact

You can expect an acknowledgement within a few days. This is a small personal project — there is no formal bug bounty.

## Scope

In scope:
- Authentication and session handling
- Row Level Security policy bypasses (players accessing handler-only data, cross-group data access)
- The `request-magic-link` Edge Function

Out of scope:
- Denial of service
- Issues requiring physical access to a device
- Social engineering

## Stack

Supabase (Postgres + RLS + Auth + Edge Functions) · Vue 3 · Netlify
