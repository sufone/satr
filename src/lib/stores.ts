import { writable, type Writable } from 'svelte/store';
import type { Text, Line } from './db';

export type View = 'list' | 'add' | 'review';

export const currentView: Writable<View> = writable('list');
export const activeText: Writable<Text | null> = writable(null); // Text being reviewed or viewed
export const textsList: Writable<Text[]> = writable([]); // Cache of all texts
export const currentReviewLine: Writable<Line | null> = writable(null);
export const reviewQueue: Writable<Line[]> = writable([]);