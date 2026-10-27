import { buildSite } from './build.mjs';
import { renderPartnerPages } from './lib/render-partner.mjs';
import { fileURLToPath } from 'node:url';
await buildSite({requirePublication:true});
await renderPartnerPages(fileURLToPath(new URL('..',import.meta.url)));
