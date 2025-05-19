// src/lib/utils/srs.ts
import type { Line } from '../db';

const MIN_INTERVAL = 1; // 1 day
const INITIAL_EASE_FACTOR = 2.5;

// Simplified SM-2 like logic
export function calculateNextReview(line: Line, remembered: boolean): Partial<Line> {
  const now = new Date();
  let { repetitions, interval, easeFactor, lapses, maskLevel, originalLineText } = line;
  const totalWords = originalLineText.split(/\s+/).length;

  if (remembered) {
    repetitions += 1;
    if (repetitions === 1) {
      interval = MIN_INTERVAL; // First successful review
    } else if (repetitions === 2) {
      interval = Math.max(MIN_INTERVAL, Math.round(MIN_INTERVAL * (easeFactor > 1.5 ? 2.5 : 1.5))); // e.g., 2-6 days
    } else {
      interval = Math.max(MIN_INTERVAL, Math.round(interval * easeFactor));
    }
    // Gradually hide words (increase maskLevel)
    // Ensure maskLevel doesn't exceed the number of "hideable" words (totalWords - 1)
    maskLevel = Math.min(maskLevel + 1, totalWords > 0 ? totalWords -1 : 0);

  } else {
    repetitions = 0; // Reset repetitions
    lapses += 1;
    interval = MIN_INTERVAL; // Review again soon
    easeFactor = Math.max(1.3, easeFactor - 0.2); // Decrease easeFactor on fail
    maskLevel = 0; // Show all words again
  }

  // Calculate next review date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(now.getDate() + interval);
  // For very short intervals (e.g. same day review for lapses), adjust this logic
  // For simplicity here, we're sticking to day-based intervals.

  return {
    repetitions,
    interval,
    easeFactor,
    lapses,
    nextReviewDate,
    lastReviewedAt: now,
    maskLevel,
  };
}