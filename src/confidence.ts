import { CSSSelector } from './analyzer';

export interface ConfidenceFactors {
  allAtomsFound: boolean;
  sameFileMatch: boolean;
  noCombinators: boolean;
  colocatedClasses: boolean; // Classes found in the same class attribute
  staticReference: boolean;  // Found as literal string, not dynamic
  isSingleAtom?: boolean;
}

export function calculateConfidence(selector: CSSSelector, factors: Partial<ConfidenceFactors> = {}): number {
  let score = 0;

  // Base: all atoms (class/id/tag) were found in the codebase
  if (factors.allAtomsFound ?? selector.used) {
    score += 40;
  }

  // Found in the same file (important for scoped styles) or it's a simple global atom
  if (factors.sameFileMatch || factors.isSingleAtom) {
    score += 20;
  }

  // No combinators means we can confirm statically
  if (factors.noCombinators ?? !selector.hasCombinator) {
    score += 20;
  }

  // Classes found together in the same class="..." attribute, or it's just 1 atom
  if (factors.colocatedClasses || factors.isSingleAtom) {
    score += 15;
  }

  // Found as a static string literal (not dynamic/computed)
  if (factors.staticReference ?? true) {
    score += 5;
  }

  return Math.min(100, score);
}

export function confidenceIcon(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 50) return '🟡';
  if (score >= 20) return '🟠';
  return '🔴';
}

export function confidenceLabel(score: number): string {
  if (score >= 80) return 'confirmed';
  if (score >= 50) return 'probable';
  if (score >= 20) return 'possible';
  return 'unlikely';
}
