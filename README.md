# LocalFlow — Real Places. Deeper Stories.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A context-aware matching platform for authentic local travel experiences. A traveler describes their situation in plain natural language; the engine computes physical spatial-temporal feasibility, ranks experiences using an explainable 10-factor weighted scoring model, and dynamically re-ranks on the fly when real-world conditions change.

> **Pilot Destination:** **Manali, Himachal Pradesh, India** — 44 authentic experiences across 24 verified local micro-hosts.

---

## Key Highlights

- **Feasibility-First Matching:** Evaluates round-trip mountain travel time, arrival buffers, session durations, and operating schedules to guarantee physical feasibility before ranking.
- **Explainable 10-Factor Scoring:** Fully published scoring weights ($0.20 \to 0.05$) detailing category match, time fit, budget, group suitability, distance, accessibility, local relevance, availability, trust, and itinerary clearance.
- **Instant Reactive Contingency:** One-click dynamic re-planning (*"Top pick cancelled"*, *"1 hour less"*, *"Budget dropped"*, *"Weather turned"*) recalculates optimal alternatives in milliseconds.
- **Offline & Resilient by Default:** 100% deterministic local computation with zero mandatory external API keys or database setup.
- **Micro-Host Operations:** Dedicated host dashboard for capacity management, booking requests, and emergency weather/availability toggles.

---

## Quick Start

### Installation & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev        # http://localhost:3000

# Type-check and validate
npx tsc --noEmit
npm run lint
```

> **Zero Setup Required:** LocalFlow runs 100% offline out-of-the-box. All geo-calculations, feasibility logic, intent parsing, and scoring execute deterministically in-process.

---

## The Demo Path

1. **Natural Intent (`/discover`):** Enter a plain scenario (e.g., *"In Manali with my parents. 2 hours before dinner. Budget ₹800 each. Cultural, relaxing, minimal walking."*). Observe extracted constraints with verbatim evidence spans.
2. **Feasibility & Match Scoring (`/results`):** View ranked recommendations (e.g., **Traditional Himachali Puppet Show**, 98% match). Click *"How this was scored"* to inspect all 10 weighted factors, or *"Why 34 others were not shown"* to see hard-constraint rejections.
3. **Trust & Booking (`/experience/x_puppet`):** Review the host trust card (verified credentials, safety checks) and submit a booking request.
4. **Host Dashboard (`/provider`):** Manage incoming requests on the Sharma Family dashboard and accept the booking.
5. **The Wow Moment (Dynamic Re-Ranking):** Click **"Cancel today"** on the host dashboard (or **"My top pick was cancelled"** on results). The engine instantly recomputes feasible alternatives from remaining time and budget, promoting a new top pick with an explanatory banner.

---

## Technical Details

### Architecture

```
Traveler & Host UI (Next.js 16 · React 19 · Tailwind CSS v4)
                            │
                            ▼
API Layer (/api/extract · /api/contingency · /api/bookings)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        NLP Pipeline              Matching & Scoring Engine
    • lib/nlp/intentParser.ts     • lib/engine/geo.ts (Mountain road model)
    • lib/nlp/classifier.ts       • lib/engine/time.ts (Slots & feasibility)
    • lib/nlp/smartExtract.ts     • lib/engine/recommend.ts (10-factor scorer)
              │                   • lib/engine/matchExplainer.ts
              └─────────────┬─────────────┘
                            ▼
     State & Data Layer (lib/store.ts · lib/clientState.ts)
```

### Spatial-Temporal Feasibility Engine

Conventional platforms suggest activities without verifying physical feasibility. LocalFlow evaluates door-to-door commitment before ranking:

$$T_{\text{commitment}} = T_{\text{travelTo}} + T_{\text{wait}} + D_{\text{duration}} + T_{\text{travelBack}} \le T_{\text{available}}$$

- **Mountain Road Distance:** $d_{\text{road}} = d_{\text{haversine}} \times 1.35$ accounts for valley elevation and switchbacks.
- **Speed Curve:** 12 km/h in town (<2 km), 20 km/h suburban (<6 km), 28 km/h valley highway (<20 km), plus fixed overhead for vehicle hailing and parking.
- **Earliest Feasible Start:** Aligns arrival time with operating slot schedules on the selected day.

### Explainable 10-Factor Scoring

Candidates passing hard filters receive a match score from **0 to 100**:

$$\text{MatchScore} = \text{round}\left(100 \times \sum_{i=1}^{10} w_i \cdot s_i\right) \quad \text{where} \quad \sum_{i=1}^{10} w_i = 1.0$$

| Factor | Weight | Evaluation Logic |
| :--- | :---: | :--- |
| **`interest`** | **0.20** | Category match (1.0), tag match (0.55), or unlisted (0.15); adjusted by requested pace. |
| **`time`** | **0.15** | Optimal commitment ratio (55%–90% of available window = 1.0; penalized if rushed or underutilized). |
| **`budget`** | **0.12** | Comfortably within per-person limit scores highest; ceiling scraping is scaled down. |
| **`group`** | **0.10** | Suitability for traveler type (family, solo, couple, parents) + capacity headroom. |
| **`distance`** | **0.09** | Road proximity from traveler's location (full score $\le$ 2 km, decaying to 0.20 at 30 km). |
| **`accessibility`**| **0.08** | Step-free wheelchair confirmation and seated low-walking matching (+shelter bonus for indoor). |
| **`local`** | **0.08** | Local relevance index (0–100) based on family ownership, living craft, and community roots. |
| **`availability`** | **0.07** | Wait time before session start ($\le$15 min wait = 1.0; linearly scaled to 0.40 at 3 hours). |
| **`trust`** | **0.06** | Host verification badge (0.50), star rating (0.35), and review volume (0.15). |
| **`itinerary`** | **0.05** | Conflict-free buffer before subsequent calendar commitments ($\ge$30 min buffer = 1.0). |

### Hard Constraint Filters

Candidates are eliminated immediately if they violate any of the 12 hard constraints:
- Inactive provider · Cancelled today · Price over budget · Group exceeds capacity · Below minimum group · Closed on selected day · No slot in window · **Round trip exceeds available time** · Missing wheelchair step-free access · High physical demand when low-walking requested · Below 75 local-relevance when "local only" chosen · Collision with existing itinerary.

### Natural Language Intent Extraction

- **Rule-Based Parser (`lib/nlp/intentParser.ts`):** Zero-latency deterministic parser extracting time, budget, group, category, mobility, and landmarks with verbatim text spans.
- **Optional LLM Gap-Filler (`lib/nlp/smartExtract.ts`):** Provider-agnostic client (OpenAI-compatible) that fills only unresolved `default` fields while keeping rule extractions intact.

### State & Persistence

- **In-Memory Store (`lib/store.ts`):** Reactive singleton handling 44 experiences, 24 hosts, live bookings, reviews, and lead queues (swappable for PostgreSQL/Supabase).
- **URL State Serialization (`lib/clientState.ts`):** Traveler queries are compressed into URL-safe Base64 (`?q=...`), enabling deep-linking, refresh persistence, and instant browser back/forward navigation.

---

## API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/extract` | `POST` | Parses natural language text into structured travel constraints. |
| `/api/contingency` | `POST` | Triggers single-day cancellation / restoration for real-time contingency re-ranking. |
| `/api/bookings` | `GET` | Retrieves current bookings and host statuses. |
| `/api/bookings` | `POST` | Creates bookings, updates status (`accept`/`decline`/`cancel`), toggles active state, or triggers `cancel_today`. |

---

## Repository Structure

```
├── app/
│   ├── api/extract/route.ts            # Intent extraction endpoint
│   ├── api/contingency/route.ts        # Single-day contingency toggle
│   ├── api/bookings/route.ts           # Booking lifecycle & host actions
│   ├── api/experiences/route.ts        # Experience catalog & onboarding API
│   ├── api/recommend/route.ts          # Matching & recommendation API
│   ├── discover/page.tsx               # Constraint extraction & refinement
│   ├── results/page.tsx                # Ranked recommendations & re-ranking
│   ├── experience/[id]/page.tsx        # Experience details, trust card & booking
│   ├── provider/page.tsx               # Host dashboard & capacity management
│   ├── provider/new/page.tsx           # New experience listing & classifier preview
│   └── discovery/page.tsx              # Supply discovery pipeline & leads
├── components/
│   ├── BookingModal.tsx                # Booking dialog with capacity validation
│   ├── ExperienceMap.tsx               # Interactive location map & route pins
│   ├── HeroSearch.tsx                  # Landing page search bar with presets
│   ├── Navbar.tsx                      # Main navigation header & branding
│   ├── ProviderConsole.tsx             # Host booking lists & experience manager
│   ├── RecommendationCard.tsx          # Match cards, factor breakdowns & timeline
│   └── UIComponents.tsx                # Art gradients, match rings, meters & badges
├── lib/
│   ├── nlp/                            # Intent parser, classifier & smart extraction
│   ├── data/                           # Seeded experiences, providers & reviews
│   ├── engine/                         # Geo-model, time slots, scoring & explanations
│   ├── clientState.ts                  # URL Base64 state serialization
│   ├── store.ts                        # In-memory reactive data store
│   └── types.ts                        # TypeScript domain interfaces
└── public/images/                      # Creative Commons regional photography
```

---

## Optional Configuration

To enable optional LLM gap-filling for edge-case natural language queries:

```bash
# .env.local (optional)
LLM_API_KEY=your_api_key
# Optional overrides:
# LLM_MODEL=gpt-4o-mini
# LLM_API_URL=https://api.openai.com/v1/chat/completions
```

---

## Media Attribution

All imagery in `public/images/` is sourced from Wikimedia Commons under Creative Commons licensing:
- **Kullu Valley & Beas River:** Scenic photography of the Beas river and Kullu valley.
- **Hidimba Devi Temple:** Dhungri pine forest heritage architecture.
- **Traditional Himachali Dham & Thali:** Authentic regional cuisine.
- **Himachali Nati Dancers:** Living folk dance traditions.
- **River Beas Rafting & Mountain Trails:** Regional outdoor adventure.

---

## License

Distributed under the MIT License.
