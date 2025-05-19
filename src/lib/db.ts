// src/lib/db.js
import Dexie, { type Table } from 'dexie';

export interface Text {
  id?: number;
  title: string;
  author?: string; // Added author field
  content: string;
  createdAt: Date;
  lastReviewedAt?: Date;
  maxUnlockedLineNumber: number; // 0-indexed. Init to 0 (first line unlocked by default).
}

export interface Line {
  id?: number;
  textId: number;
  lineNumber: number;
  originalLineText: string;
  nextReviewDate: Date;
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt?: Date;
  maskLevel: number; // 0 = all visible, 1 = last word hidden, etc.
}

export class LineByLineDB extends Dexie {
  texts!: Table<Text>;
  lines!: Table<Line>;

  constructor() {
    super('LineByLineDB');
    this.version(1).stores({
      texts: '++id, title, createdAt', // id is auto-incrementing, title and createdAt are indexed
      lines: '++id, textId, lineNumber, nextReviewDate', // textId, lineNumber, nextReviewDate are indexed
    });
  }
}

export const db = new LineByLineDB();

// --- Utility functions ---

export async function addTextWithLines(title: string, content: string, author?: string): Promise<number | undefined> {
  if (!title.trim() || !content.trim()) {
    alert('Title and content cannot be empty.');
    return;
  }

  try {
    const textId = await db.transaction('rw', db.texts, db.lines, async () => {
      const newTextId = await db.texts.add({
        title,
        author: author?.trim() || undefined, // Store author if provided
        content: fullContent,
        createdAt: new Date(),
        maxUnlockedLineNumber: 0, // First line is unlocked by default
      });

      const linesArray = fullContent.split('\n').filter(line => line.trim() !== '');
      const initialLines: Omit<Line, 'id'>[] = linesArray.map((lineText, index) => ({
        textId: newTextId as number,
        lineNumber: index,
        originalLineText: lineText,
        nextReviewDate: new Date(), // All lines initially due for first review when "unlocked"
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        maskLevel: 0, // We'll use a new masking strategy, but keep this for now or adapt
        lastReviewedAt: undefined, // Not reviewed yet
      }));

      await db.lines.bulkAdd(initialLines as Line[]);
      return newTextId;
    });
    console.log("Text added with ID:", textId);
    return textId;
  } catch (error) {
    console.error("Failed to add text and lines:", error);
    alert("Error adding text. See console for details.");
    return undefined;
  }
}

export async function getAllTexts(): Promise<Text[]> {
  return await db.texts.orderBy('createdAt').reverse().toArray();
}

export async function getTextById(id: number): Promise<Text | undefined> {
  return await db.texts.get(id);
}

export async function getLinesForText(textId: number): Promise<Line[]> {
  return await db.lines.where('textId').equals(textId).sortBy('lineNumber');
}

export async function getDueLinesForText(textId: number): Promise<Line[]> {
  const now = new Date();
  return await db.lines
    .where('textId').equals(textId)
    .and(line => line.nextReviewDate <= now)
    .sortBy('lineNumber');
}

export async function getNextUnreviewedLineForText(textId: number): Promise<Line | undefined> {
    // A line is unreviewed if lastReviewedAt is undefined
    return await db.lines
        .where('textId').equals(textId)
        .filter(line => !line.lastReviewedAt)
        .sortBy('lineNumber')
        .first();
}


export async function updateLine(line: Line): Promise<number> {
  return await db.lines.put(line);
}

export async function deleteTextAndLines(textId: number): Promise<void> {
  await db.transaction('rw', db.texts, db.lines, async () => {
    await db.lines.where('textId').equals(textId).delete();
    await db.texts.delete(textId);
  });
}

export async function updateText(id: number, changes: Partial<Omit<Text, 'id'>>) {
  return await db.texts.update(id, changes);
  }