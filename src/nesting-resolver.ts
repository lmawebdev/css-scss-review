import { Rule, AtRule, Container } from 'postcss';

/**
 * Given a postcss Rule node (possibly nested), resolves the full selector
 * by walking up through parent rules and replacing `&` with parent selectors.
 * 
 * For `.card { &__header { color: red; } }`, calling this on the inner rule
 * returns `'.card__header'`.
 * 
 * For `.card { .title { } }`, returns `'.card .title'` (descendant combinator).
 * 
 * For `.card { &.active { } }`, returns `'.card.active'`.
 */
export function resolveNestedSelector(rule: Rule): string[] {
  const parentSelectors = getParentSelectors(rule);
  
  if (parentSelectors.length === 0) {
    // Top-level rule, return as-is split by commas
    return splitSelectors(rule.selector);
  }

  const currentSelectors = splitSelectors(rule.selector);
  const resolved: string[] = [];

  for (const current of currentSelectors) {
    for (const parent of parentSelectors) {
      if (current.includes('&')) {
        // Replace & with parent selector
        resolved.push(current.replace(/&/g, parent));
      } else {
        // No & means descendant combinator (implicit space)
        resolved.push(`${parent} ${current}`);
      }
    }
  }

  return resolved;
}

/**
 * Recursively get the resolved selectors of all parent rules.
 */
function getParentSelectors(rule: Rule): string[] {
  let parent: Container | undefined = rule.parent as Container | undefined;
  
  // Skip @media, @supports, etc. — they don't contribute to selectors
  while (parent && isAtRule(parent)) {
    parent = parent.parent as Container | undefined;
  }

  if (!parent || !isRule(parent)) {
    return [];
  }

  // Recursively resolve parent
  return resolveNestedSelector(parent);
}

function splitSelectors(selector: string): string[] {
  // Simple comma split, respecting parentheses
  const result: string[] = [];
  let current = '';
  let depth = 0;
  
  for (const char of selector) {
    if (char === '(' || char === '[') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) result.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }
  
  const trimmed = current.trim();
  if (trimmed) result.push(trimmed);
  
  return result;
}

function isRule(node: any): node is Rule {
  return node && node.type === 'rule';
}

function isAtRule(node: any): node is AtRule {
  return node && node.type === 'atrule';
}

/**
 * Extract individual class names from a fully resolved selector.
 * e.g. '.card__header' → ['card__header']
 *      '.card.active' → ['card', 'active']
 *      '.card .title' → ['card', 'title']
 */
export function extractClassesFromResolved(resolvedSelector: string): string[] {
  const classRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  const classes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = classRegex.exec(resolvedSelector)) !== null) {
    classes.push(m[1]);
  }
  return classes;
}

/**
 * Extract IDs from a fully resolved selector.
 */
export function extractIdsFromResolved(resolvedSelector: string): string[] {
  const idRegex = /#([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = idRegex.exec(resolvedSelector)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}
