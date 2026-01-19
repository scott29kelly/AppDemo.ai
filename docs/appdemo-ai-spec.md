# AppDemo.ai — Product Specification & Development Roadmap

> **"Paste your URL, get a polished product demo video in minutes."**

**Version:** 1.0  
**Author:** Scott + Claude  
**Date:** January 17, 2026  
**Status:** Pre-Development Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Target Market](#target-market)
5. [Competitive Analysis](#competitive-analysis)
6. [Product Architecture](#product-architecture)
7. [Technical Specifications](#technical-specifications)
8. [Data Models & Schemas](#data-models--schemas)
9. [User Experience Flow](#user-experience-flow)
10. [MVP Feature Set](#mvp-feature-set)
11. [Development Roadmap](#development-roadmap)
12. [Tech Stack Decisions](#tech-stack-decisions)
13. [Infrastructure & Deployment](#infrastructure--deployment)
14. [Cost Analysis](#cost-analysis)
15. [Pricing Strategy](#pricing-strategy)
16. [Go-to-Market Strategy](#go-to-market-strategy)
17. [Risk Assessment](#risk-assessment)
18. [Success Metrics](#success-metrics)
19. [Future Roadmap](#future-roadmap)
20. [Appendices](#appendices)

---

## Executive Summary

### The Opportunity

No tool currently exists that can take a URL input and autonomously generate a polished product demo video. The market has:

- **Interactive demo platforms** (Arcade, Supademo, Navattic) — require manual click-through recording
- **AI video polish tools** (Clueso, Descript) — enhance recordings but don't create them
- **AI browser agents** (Stagehand, Skyvern) — automate browsing but don't produce video output

**AppDemo.ai fills the gap** by combining autonomous AI exploration with professional video production.

### The Product

AppDemo.ai is a SaaS platform that transforms any web application URL into a polished, narrated product demo video—without requiring the user to record anything.

**Input:** App URL (+ optional GitHub repo, target audience description)  
**Output:** Professional demo video(s) with AI narration, animated overlays, and multiple length options

### The Business Model

- **Freemium SaaS** with usage-based pricing
- **Target:** SaaS companies, startups, product teams, agencies
- **Revenue:** $29-199/month subscriptions + pay-per-demo option

---

## Problem Statement

### The Pain Points

| Stakeholder | Current Pain | Time/Cost Impact |
|-------------|--------------|------------------|
| **Product Managers** | Recording demos is tedious; re-record for every update | 2-4 hours per demo |
| **Marketing Teams** | Need professional quality but lack video skills | $500-2000 per outsourced demo |
| **Founders/Indie Hackers** | Can't afford video production; demos look amateur | Lost conversions |
| **Developer Advocates** | Demos become stale as product evolves | Constant maintenance burden |
| **Sales Engineers** | Custom demos for each prospect take too long | 30-60 min per personalized demo |

### The Current Workflow (What We're Replacing)

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (2-8 hours)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Plan demo flow          (30-60 min)                             │
│  2. Write script            (30-60 min)                             │
│  3. Set up recording        (15-30 min)                             │
│  4. Record screen           (30-60 min, multiple takes)             │
│  5. Record voiceover        (30-60 min, multiple takes)             │
│  6. Edit in video software  (1-3 hours)                             │
│  7. Add overlays/effects    (30-60 min)                             │
│  8. Export & review         (15-30 min)                             │
│  9. Revisions               (1-2 hours)                             │
│                                                                      │
│  TOTAL: 4-10 hours per polished demo                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

### The AppDemo.ai Workflow (What We're Building)

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│                    FUTURE STATE (5-15 minutes)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Paste URL               (10 seconds)                            │
│  2. AI explores app         (2-5 min, automated)                    │
│  3. Review/edit script      (2-5 min, optional)                     │
│  4. Generate video          (3-5 min, automated)                    │
│  5. Download & share        (instant)                               │
│                                                                      │
│  TOTAL: 5-15 minutes per polished demo                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Solution Overview

### Core Value Proposition

**"Zero-recording demo videos"** — The user never touches a screen recorder, never narrates, never edits.

### How It Works

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │  INPUT   │ → │ ANALYZE  │ → │  SCRIPT  │ → │  RECORD  │         │
│  │          │   │          │   │          │   │          │         │
│  │ • URL    │   │ • Crawl  │   │ • AI     │   │ • Agent  │         │
│  │ • GitHub │   │ • Map    │   │   writes │   │   clicks │         │
│  │ • Audience│  │   flows  │   │   demo   │   │ • Screen │         │
│  └──────────┘   └──────────┘   └──────────┘   │   capture│         │
│                                               └──────────┘         │
│                                                    ↓                │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ DELIVER  │ ← │  RENDER  │ ← │ NARRATE  │ ← │ OVERLAY  │         │
│  │          │   │          │   │          │   │          │         │
│  │ • 30s    │   │ • Comp-  │   │ • Eleven │   │ • Arrows │         │
│  │ • 2min   │   │   osite  │   │   Labs   │   │ • Boxes  │         │
│  │ • 5min   │   │ • Lengths│   │ • Sync   │   │ • Zooms  │         │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

### Key Differentiators

| Feature | AppDemo.ai | Arcade/Supademo | Clueso | HeyGen |
|---------|------------|-----------------|--------|--------|
| Autonomous exploration | ✅ | ❌ Manual | ❌ Manual | ❌ N/A |
| AI script generation | ✅ | ❌ | Partial | ❌ Script input |
| Video output | ✅ | Export option | ✅ | ✅ |
| Professional overlays | ✅ | ✅ | ✅ | ❌ |
| Multiple lengths | ✅ | ❌ | ❌ | ❌ |
| Zero recording required | ✅ | ❌ | ❌ | ✅ (no app) |

---

## Target Market

### Primary Segments

#### 1. SaaS Startups (Seed to Series A)
- **Size:** 5-50 employees
- **Pain:** No dedicated video team; founders doing everything
- **Budget:** $50-200/month for tools
- **Use case:** Landing page demos, investor pitches, sales leave-behinds

#### 2. Product Marketing Teams
- **Size:** Part of 50-500 person companies
- **Pain:** Constant product updates require demo refreshes
- **Budget:** $200-500/month for video tools
- **Use case:** Feature launches, campaigns, website content

#### 3. Developer Relations / DevTools
- **Size:** DevRel teams of 1-10
- **Pain:** Technical products hard to demo; frequent releases
- **Budget:** $100-300/month
- **Use case:** Documentation, tutorials, conference submissions

#### 4. Agencies & Consultants
- **Size:** Boutique agencies, freelancers
- **Pain:** Need to produce demos for multiple clients efficiently
- **Budget:** $200-500/month
- **Use case:** Client deliverables, proposals, case studies

### Ideal Customer Profile (ICP)

\`\`\`
Company: B2B SaaS with web-based product
Stage: Seed to Series B
Team size: 10-100 employees
Has: Product with multiple features worth demoing
Doesn't have: Dedicated video production team
Currently: Using Loom + manual editing OR no video at all
Budget: Can justify $100-200/month for marketing tools
\`\`\`

---

## Competitive Analysis

### Direct Competitors (Interactive Demo Platforms)

| Tool | Approach | Pricing | Strengths | Weaknesses |
|------|----------|---------|-----------|------------|
| **Arcade** | Screenshot/recording capture | $32-42/user/mo | Quick, good UX | Manual capture, no HTML |
| **Supademo** | Click-through capture | $27-38/user/mo | Affordable, AI voiceovers | Manual recording |
| **Navattic** | HTML capture | $500-1200/mo | High fidelity | Expensive, slow to create |
| **Storylane** | Multi-format | $40-80/mo | Versatile | Manual recording |
| **Clueso** | Polish raw recordings | $29/mo | Auto-zoom, AI voice | Still requires recording |

**Gap:** All require manual click-through to create demos. Nobody does autonomous exploration.

### Competitive Moat Strategy

1. **First-mover in autonomous demo generation** — Define the category
2. **Quality bar** — Overlay/animation polish is hard to replicate
3. **Vertical expertise** — Deep focus on SaaS demos specifically
4. **Workflow integration** — CI/CD hooks create switching costs
5. **Data flywheel** — More demos = better AI understanding of apps

---

## Product Architecture

### System Overview

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPDEMO.AI ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         WEB APPLICATION                              │   │
│  │  (Next.js + React)                                                   │   │
│  │  • Dashboard        • Project management    • Video preview          │   │
│  │  • Script editor    • Settings              • Download/share         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           API LAYER                                  │   │
│  │  (Node.js / tRPC)                                                    │   │
│  │  • Authentication   • Project CRUD    • Job management               │   │
│  │  • Webhook handlers • Billing         • Analytics                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│            ┌─────────────────────────┼─────────────────────────┐           │
│            ▼                         ▼                         ▼           │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐       │
│  │  ANALYSIS ENGINE │   │  RECORDING ENGINE │   │   RENDER ENGINE  │       │
│  │                  │   │                   │   │                  │       │
│  │  • Browser agent │   │  • Playwright     │   │  • FFmpeg        │       │
│  │  • Codebase scan │   │  • Overlay inject │   │  • Audio sync    │       │
│  │  • Feature map   │   │  • Screen capture │   │  • Multi-length  │       │
│  │  • Script gen    │   │  • Timing events  │   │  • Branding      │       │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘       │
│            │                         │                         │           │
│            └─────────────────────────┼─────────────────────────┘           │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         JOB QUEUE (BullMQ + Redis)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│            ┌─────────────────────────┼─────────────────────────┐           │
│            ▼                         ▼                         ▼           │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐       │
│  │    PostgreSQL    │   │   Cloudflare R2  │   │  External APIs   │       │
│  │    (Supabase)    │   │   (Storage)      │   │  Claude, 11Labs  │       │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Tech Stack Decisions

### Core Technologies

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14 (App Router) | Best DX, great for SaaS |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development |
| **Backend** | Node.js (same Next.js app) | Simplicity, shared types |
| **API** | tRPC | Type-safe, great with Next.js |
| **Database** | PostgreSQL (Supabase) | Reliable, auth included |
| **ORM** | Prisma | Type-safe, great DX |
| **Queue** | BullMQ + Redis (Upstash) | Reliable, serverless-friendly |
| **Storage** | Cloudflare R2 | Cheap, S3-compatible |
| **Hosting** | Vercel + Railway | Vercel for web, Railway for workers |

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| **Browser Automation** | Browserbase/Stagehand | Cloud browsers for recording |
| **AI (Analysis/Script)** | Anthropic Claude | Best for complex reasoning |
| **Voice Generation** | ElevenLabs | High-quality TTS |
| **Video Processing** | Self-hosted FFmpeg | Video rendering |
| **Payments** | Stripe | Billing |

---

## MVP Feature Set

### Version 1.0 — Core MVP (8 weeks)

| Feature | Priority | Notes |
|---------|----------|-------|
| URL input → Analysis | P0 | Core differentiator |
| AI script generation | P0 | Core differentiator |
| Automated recording | P0 | Core differentiator |
| Basic overlays (arrow, box) | P0 | Essential for polish |
| AI voiceover (ElevenLabs) | P0 | Essential for polish |
| Single video output | P0 | Start with one length |
| User authentication | P0 | Email/password + OAuth |
| Project dashboard | P0 | Basic CRUD |
| Video preview & download | P0 | Essential UX |

**Not in MVP:**
- Multiple video lengths
- Script editing
- Custom branding
- Team features
- API access

---

## Development Roadmap

### Phase 0: Setup (Week 1)
- Initialize monorepo structure
- Set up development environment
- Configure CI/CD pipeline
- Database schema and migrations

### Phase 1: Analysis Engine (Weeks 2-3)
- Integrate Stagehand/Browserbase
- Build app crawler
- Implement feature detection
- Build script generator (Claude integration)

### Phase 2: Recording Engine (Weeks 4-5)
- Set up Playwright infrastructure
- Build overlay injection system
- Integrate FFmpeg capture
- Test timing synchronization

### Phase 3: Render Engine (Weeks 6-7)
- Integrate ElevenLabs
- Build audio alignment system
- Build video compositor
- Generate subtitles

### Phase 4: Web Application (Week 8)
- User authentication
- Project creation wizard
- Project dashboard
- Video preview & download

### Phase 5: Launch Prep (Week 9)
- Bug fixes and polish
- Documentation
- Landing page
- Beta user recruitment

### Phase 6: Beta Launch (Week 10)
- Launch to beta users
- Collect feedback
- Iterate on UX

---

## Cost Analysis

### Per-Demo Cost Breakdown

| Component | Per Demo Cost |
|-----------|---------------|
| **Browserbase** (10 min) | $0.10 |
| **Claude API** (~10K tokens) | $0.03 |
| **ElevenLabs** (~1,500 chars) | $0.45 |
| **Compute** (10 min rendering) | $0.01 |
| **Storage** (500MB video) | $0.008 |
| **Bandwidth** (3 downloads) | $0.07 |
| **Total Variable Cost** | **~$0.67** |

### Break-Even Analysis

| Plan | Price | Variable Cost | Margin |
|------|-------|---------------|--------|
| Free | $0 | $0.67 | -$0.67 |
| Creator ($29) | $29 | $3.35 (5 demos) | $25.65 |
| Pro ($79) | $79 | $13.40 (20 demos) | $65.60 |
| Agency ($199) | $199 | ~$67 (100 demos) | $132 |

---

## Pricing Strategy

### Pricing Tiers

| Feature | Free | Creator $29 | Pro $79 | Agency $199 |
|---------|------|-------------|---------|-------------|
| Demos/month | 1 | 5 | 20 | Unlimited |
| Resolution | 720p | 1080p | 4K | 4K |
| Video lengths | 1 | All | All | All |
| Watermark | Yes | No | No | No |
| Voice options | 1 | 1 | 5 | All |
| Script editing | ❌ | ✅ | ✅ | ✅ |
| Custom branding | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |
| Team seats | 1 | 1 | 3 | 10 |

**Pay-per-demo option:** $15/demo (no subscription required)

---

## Go-to-Market Strategy

### Launch Sequence

1. **Week -4:** Landing page with waitlist (target: 500 signups)
2. **Week -2:** Indie Hackers post, Twitter teasers
3. **Week 10:** Beta launch to waitlist (50 users)
4. **Week 14:** Public launch
   - Product Hunt
   - Hacker News (Show HN)
   - Twitter launch thread
   - Reddit (r/SaaS, r/startups)

### Growth Channels

| Channel | Strategy | Budget |
|---------|----------|--------|
| **Content Marketing** | SEO blog posts, YouTube tutorials | $0 (time) |
| **Social Proof** | Case studies, testimonials | $0 |
| **Partnerships** | Integrations with SaaS tools | $0 |
| **Paid Ads** | Google Ads, Twitter Ads | $1000/mo |
| **Affiliate Program** | 20% recurring commission | % of revenue |

---

## Success Metrics

### North Star Metric

**Demos Generated Per Week** — Measures core product usage

### Primary Metrics (Monthly Targets)

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Signups | 200 | 500 | 1000 |
| Demos generated | 50 | 300 | 1500 |
| Paying customers | 5 | 30 | 150 |
| MRR | $200 | $2,000 | $10,000 |

### Secondary Metrics

| Metric | Target |
|--------|--------|
| Activation rate | >40% |
| Demo success rate | >85% |
| Time to first demo | <15 min |
| Free-to-paid conversion | >5% |
| Monthly churn | <8% |

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| App exploration fails on complex SPAs | High | Fallback to simpler flow |
| Recording timing drift | Medium | Buffer time; multiple sync points |
| Selectors break between runs | Medium | AI to re-identify elements |

### Business Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Low conversion from free | High | Optimize free tier limits |
| Competitor builds same thing | Medium | Move fast; build brand |
| Can't achieve polish quality | Medium | Manual review step option |

---

## Future Roadmap

### Q2 2026
- Mobile app demos
- Interactive demo output (Arcade-style)
- Auto-update demos on deploy

### Q3 2026
- Demo analytics dashboard
- Personalized demos (dynamic variables)
- Multi-language narration

### Q4 2026
- AI demo coach
- Collaborative editing
- Enterprise SSO
- SOC 2 compliance

---

## Next Steps

1. **Validate** — Share spec with potential users for feedback
2. **Prioritize** — Confirm MVP scope is achievable in 8 weeks
3. **Setup** — Initialize repo, CI/CD, and development environment
4. **Build** — Begin Phase 1 (Analysis Engine)

---

*This document is a living specification. Update as decisions are made.*
