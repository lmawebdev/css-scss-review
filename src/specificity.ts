import selectorParser from 'postcss-selector-parser';

export interface Specificity {
  a: number; // ID selectors
  b: number; // Class selectors, attribute selectors, pseudo-classes
  c: number; // Type selectors, pseudo-elements
}

export function calculateSpecificity(selector: string): Specificity {
  const result: Specificity = { a: 0, b: 0, c: 0 };
  
  try {
    selectorParser(selectors => {
      // For comma-separated selectors, take the highest specificity
      let maxSpec: Specificity = { a: 0, b: 0, c: 0 };
      
      selectors.each(selectorNode => {
        const spec: Specificity = { a: 0, b: 0, c: 0 };
        
        selectorNode.walk(node => {
          switch (node.type) {
            case 'id':
              spec.a++;
              break;
            case 'class':
            case 'attribute':
              spec.b++;
              break;
            case 'tag':
              if (node.value !== '*') {
                spec.c++;
              }
              break;
            case 'pseudo': {
              const pseudoValue = String(node.value || '').toLowerCase();
              // Pseudo-elements count as type selectors (c)
              if (pseudoValue.startsWith('::') || 
                  pseudoValue === ':before' || 
                  pseudoValue === ':after' ||
                  pseudoValue === ':first-line' ||
                  pseudoValue === ':first-letter') {
                spec.c++;
              }
              // :not(), :is(), :has() — specificity of their argument
              // :where() — zero specificity
              else if (pseudoValue === ':where') {
                // zero specificity, skip
              }
              else if (pseudoValue === ':not' || pseudoValue === ':is' || pseudoValue === ':has') {
                // The specificity is handled by walking into the children
                // Don't count the pseudo itself
              }
              // All other pseudo-classes count as class selectors (b)
              else {
                spec.b++;
              }
              break;
            }
          }
        });
        
        if (compareSpecificity(spec, maxSpec) > 0) {
          maxSpec = spec;
        }
      });
      
      result.a = maxSpec.a;
      result.b = maxSpec.b;
      result.c = maxSpec.c;
    }).processSync(selector);
  } catch {
    // Return zero specificity on parse error
  }
  
  return result;
}

export function compareSpecificity(a: Specificity, b: Specificity): number {
  if (a.a !== b.a) return a.a - b.a;
  if (a.b !== b.b) return a.b - b.b;
  return a.c - b.c;
}

export function formatSpecificity(spec: Specificity): string {
  return `(${spec.a},${spec.b},${spec.c})`;
}

export function specificityScore(spec: Specificity): number {
  return spec.a * 100 + spec.b * 10 + spec.c;
}
