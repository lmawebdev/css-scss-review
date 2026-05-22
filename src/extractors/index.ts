import { UsageExtractor } from './types';
import { HtmlExtractor } from './html-extractor';
import { AngularExtractor } from './angular-extractor';
import { SvelteExtractor } from './svelte-extractor';
import { AstroExtractor } from './astro-extractor';
import { PugExtractor } from './pug-extractor';
import { DomApiExtractor } from './dom-api-extractor';
import { TagExtractor } from './tag-extractor';
import { JsxExtractor } from './jsx-extractor';
import { VueExtractor } from './vue-extractor';
import { CssModulesExtractor } from './css-modules-extractor';

export { UsageExtractor, ScanContext, addLocation, buildLineStarts, offsetToPosition } from './types';

export function createExtractors(): UsageExtractor[] {
  return [
    new HtmlExtractor(),
    new AngularExtractor(),
    new SvelteExtractor(),
    new AstroExtractor(),
    new PugExtractor(),
    new DomApiExtractor(),
    new TagExtractor(),
    new JsxExtractor(),
    new VueExtractor(),
    new CssModulesExtractor(),
  ];
}
