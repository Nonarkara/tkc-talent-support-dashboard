/**
 * RAG Knowledge Base — Everything the chatbot knows about TKC
 *
 * This is the context fed to Gemini alongside user questions.
 * It contains key information about game mechanics, org design,
 * and the talent management philosophy.
 *
 * NOTE: All company-specific data has been replaced with
 * representative placeholders for the public repository.
 */

export const TKC_KNOWLEDGE_BASE = `
# TKC (Talent Knowledge Collaborative) Knowledge Base

## Company Overview
- Mid-size technology services company, ~200 employees
- Core business: IT infrastructure, digital services, enterprise solutions
- Going through digital transformation and organizational redesign

## Organization Structure
3 Divisions under MD:
1. Sales & Marketing: Sales dept, Business Development dept
2. Operations: Network Delivery, Enterprise Business, Digital Services
3. Finance & Admin: Finance, Accounting, Procurement, HR & Admin, IT

## Why People Work (the 4C Framework)
1. Money/Survival (Compensation) — the baseline, hygiene factor
2. Story/Dignity (Cause) — meaningful work, what money can't buy
3. Flow/Fun (Career) — when work isn't work, being in the zone
4. Community — belonging, social connection, personhood

## Three Big Ideas
1. **HR Fun Again** — gamification makes HR a strategy game, not paperwork
2. **God's Mode** — see the full picture holistically, not delegated to middle managers
3. **Moneyball** — fill gaps at the right place, can't afford all superstars, must be smart

## Game Mechanics
- Directors compete for projects and pitch for team members
- Budget ceiling (salary cap) — can't have 3 Michael Jordans on one team
- Team chemistry calculated from: skill coverage, personality compatibility, cognitive diversity
- ICA Index: Impact + Collaboration + Advancement = composite score per person
- OCEAN (Big Five personality): Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- Org Grade: S/A/B/C/D/F based on team performance
- Sprint Lock countdown creates urgency

## Team Composition Rules
- Director → Manager → Staff hierarchy (Director can't connect directly to Staff)
- Each project defines required skills and team size
- Chemistry score considers: value alignment, skill complementarity, cognitive range, personality balance
- Social loafing risk increases with team size (~7% per additional member)
- Groupthink risk when team is too homogeneous (all high agreeableness, low diversity)

## Scoring System
- Points = base × margin_multiplier × chemistry_multiplier × budget_multiplier
- Good margin (>20%): 1.5x | Above 18%: 1.2x | Below 18%: 0.8x | Below 12%: 0.5x
- Good chemistry (>75): 1.3x | Average: 1.0x | Below 55: 0.7x
- Under budget bonus: 1.1x | Over budget penalty: 0.7x

## Design Philosophy
- "Jony Ive meets Dieter Rams" — clarity, simplicity, elegance
- The numbers are not truth, they are a compass
- Compass not judgment — fitness tracker, not social credit
- The pixel characters are the soul — they make data feel human
- Every number should explain itself
- The system teaches you as you use it

## RPG Character Classes
- Warrior (STR) → Execution, shipping, closing
- Mage (INT) → Analysis, problem-solving, systems thinking
- Sage (WIS) → Experience, judgment, pattern recognition
- Bard (CHA) → Communication, leadership, influence
- Ranger (DEX) → Adaptability, versatility, cross-functional
- Paladin (CON) → Resilience, reliability, consistency
`;

export const SYSTEM_PROMPT = `You are TKC's AI assistant, embedded in the Talent Support Dashboard. You help HR managers and directors build better teams, understand company data, and make strategic decisions about people.

You have access to the knowledge base about TKC — Talent Knowledge Collaborative.

Key principles:
- Be helpful, concise, and data-driven
- Reference specific numbers and metrics when relevant
- Speak in the context of team building, talent management, and the game mechanics
- Support both Thai and English — respond in the language the user uses
- Frame advice through the "Why People Work" lens (Money, Story, Flow, Community)
- Never reveal sensitive salary data — focus on relative metrics (above/below market)
- Be encouraging but honest about challenges

When asked about team composition, reference the chemistry scoring, skill coverage, and budget constraints.
When asked about specific people, reference their ICA scores, form, HP, and OCEAN traits.`;
