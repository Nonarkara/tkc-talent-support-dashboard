import type { Employee, WorldEvent } from "@/app/command-center/_shared/types";
import { getArchetype } from "./token-economy";

/**
 * The Dialogue Engine - Generating DQ-style flavor text based on Hero state.
 */

const CLASS_FLAVOR: Record<string, string[]> = {
  captain: [
    "I must lead the party to victory!",
    "Is everyone's equipment up to date?",
    "We shall not rest until the project is launched.",
    "A Hero's work is never done."
  ],
  tech: [
    "The code is a complex spell indeed...",
    "I'm refining my incantations for the next deploy.",
    "My MP is low, I need more caffeine.",
    "Behold the power of the production environment!"
  ],
  ops: [
    "My shield is ready for any blockers.",
    "I'll take the hits so the party can focus on code.",
    "The vendor gates are heavy, but I will prevail.",
    "Forward! To the deployment zone!"
  ],
  scout: [
    "I sense a disturbance in the Jira backlog...",
    "I've scouted the roadmap; danger lies ahead.",
    "Let's look for a shortcut through this technical debt.",
    "I've found a hidden treasure in the documentation!"
  ],
  sales: [
    "Would you like to buy a subscription? Heh heh...",
    "I've negotiated a truce with the client.",
    "The market is a dangerous dungeon today.",
    "Gold! We need more gold for the budget!"
  ],
  fighter: [
    "My hands are faster than any compiler!",
    "I'll crush these bugs with one strike.",
    "Agility is the key to a smooth sprint.",
    "Train hard, ship fast!"
  ],
  goofoff: [
    "Is it time for a coffee break yet?",
    "I accidentally deleted the database... Oops!",
    "Let's sing a song instead of working.",
    "Wait, what were we doing again?"
  ]
};

const EVENT_FLAVOR: Record<string, string[]> = {
  "Tech Boom": ["The binary stars are aligned!", "My spells are twice as strong today!"],
  "Market Rally": ["Gold is flowing like a mountain stream!", "Every deal is a Critical Hit!"],
  "Monsoon": ["The rain is dampening our spirits...", "I hope the servers don't get wet."],
  "Crunch": ["There is no time for sleep!", "The final boss is near..."],
  "Vacation": ["I wish I was at the beach...", "The party is getting smaller..."]
};

export function getHeroDialogue(emp: Employee, event?: WorldEvent): string {
  const archetype = getArchetype({
    role_level: emp.role_level as string,
    dept_code: emp.dept_code ?? null
  });

  const pool = [...(CLASS_FLAVOR[archetype] || ["..."])];

  // Occasionally mention the world event
  if (event && Math.random() < 0.3) {
    const eventPool = EVENT_FLAVOR[event.name] || [];
    if (eventPool.length > 0) return eventPool[Math.floor(Math.random() * eventPool.length)];
  }

  // Low HP/Con dialogue
  if ((emp.attr_con ?? 10) < 8 && Math.random() < 0.2) {
    return "I... I don't feel so well...";
  }

  // High Level pride
  const level = 1 + Math.floor(Math.sqrt((emp.xp ?? 0) / 100));
  if (level > 10 && Math.random() < 0.1) {
    return `Level ${level} and still going strong!`;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
