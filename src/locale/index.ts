import type { Mode } from '../types/index.js';
import { ja, type Locale } from './ja.js';
import { global } from './global.js';

export type { Locale };

export function getLocale(mode: Mode): Locale {
  return mode === 'ja' ? ja : global;
}
