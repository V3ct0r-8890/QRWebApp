import type { VCardFields } from '../qr/encode';

export type LogoAlign = 'left' | 'center' | 'right';
export type CardTheme = 'light' | 'dark' | 'blue' | 'pink';

export interface CardProfile extends VCardFields {
  id: string;
  /** User-facing label for the slot, e.g. "Work", "Personal", "Meetup badge". */
  label: string;
  /** Optional logo as a data URL, resized client-side before storage. */
  logo?: string;
  /** Horizontal placement of the logo within the banner. Defaults to 'center'. */
  logoAlign?: LogoAlign;
  /** Card color theme. Defaults to 'light' (today's look). */
  theme?: CardTheme;
}

export const MAX_CARDS = 10;

const STORAGE_KEY = 'qrwebapp.cards.v1';

export class CardLimitError extends Error {
  constructor() {
    super(`You already have ${MAX_CARDS} saved cards — delete one before adding another.`);
    this.name = 'CardLimitError';
  }
}

function readAll(): CardProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    // Corrupt or foreign data in this key must not crash the app — treat it
    // as empty and let the user start fresh rather than losing the whole UI.
    console.error('Failed to read saved cards from localStorage; treating as empty.', err);
    return [];
  }
}

function writeAll(cards: CardProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function listCards(): CardProfile[] {
  return readAll();
}

export function getCard(id: string): CardProfile | undefined {
  return readAll().find((c) => c.id === id);
}

/** Creates a new card, or updates an existing one if `card.id` already exists. */
export function saveCard(card: CardProfile): void {
  const cards = readAll();
  const existingIndex = cards.findIndex((c) => c.id === card.id);
  if (existingIndex >= 0) {
    cards[existingIndex] = card;
  } else {
    if (cards.length >= MAX_CARDS) {
      throw new CardLimitError();
    }
    cards.push(card);
  }
  writeAll(cards);
}

export function deleteCard(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function generateCardId(): string {
  return crypto.randomUUID();
}
