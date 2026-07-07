import { Metal } from '@/types';

/** Silver is traded/quoted per kg in the UI; gold per gram. Storage always keeps grams and per-gram rate. */
const GRAMS_PER_KG = 1000;

export function toStorageQuantity(metal: Metal, displayQuantity: number): number {
  return metal === 'SILVER' ? displayQuantity * GRAMS_PER_KG : displayQuantity;
}

export function toDisplayQuantity(metal: Metal, storageQuantityGrams: number): number {
  return metal === 'SILVER' ? storageQuantityGrams / GRAMS_PER_KG : storageQuantityGrams;
}

export function toStorageRate(metal: Metal, displayRate: number): number {
  return metal === 'SILVER' ? displayRate / GRAMS_PER_KG : displayRate;
}

export function toDisplayRate(metal: Metal, storageRatePerGram: number): number {
  return metal === 'SILVER' ? storageRatePerGram * GRAMS_PER_KG : storageRatePerGram;
}

export function quantityUnit(metal: Metal): string {
  return metal === 'SILVER' ? 'kg' : 'g';
}
