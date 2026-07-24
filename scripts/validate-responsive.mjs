import {readFile} from 'node:fs/promises';

const [config, responsiveCss] = await Promise.all([
  readFile(new URL('../docusaurus.config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/css/mobile.css', import.meta.url), 'utf8'),
]);

const requirements = [
  ['responsive stylesheet is loaded', config.includes("require.resolve('./src/css/mobile.css')")],
  ['tablet breakpoint exists', responsiveCss.includes('@media (max-width: 996px)')],
  ['phone breakpoint exists', responsiveCss.includes('@media (max-width: 700px)')],
  ['small-phone breakpoint exists', responsiveCss.includes('@media (max-width: 430px)')],
  ['narrow-phone breakpoint exists', responsiveCss.includes('@media (max-width: 360px)')],
  ['landscape-phone layout exists', responsiveCss.includes('(orientation: landscape)')],
  ['touch targets are at least 48px', /\.button\s*\{[\s\S]*?min-height:\s*48px/.test(responsiveCss)],
  ['mobile action buttons use full width', /\.actionRow \.button\s*\{[\s\S]*?width:\s*100%/.test(responsiveCss)],
  ['mobile navigation drawer is constrained', responsiveCss.includes('width: min(90vw, 24rem)')],
  ['horizontal overflow is prevented', responsiveCss.includes('overflow-x: clip')],
  ['safe-area insets are supported', responsiveCss.includes('env(safe-area-inset-bottom)')],
  ['reduced-data mode is supported', responsiveCss.includes('@media (prefers-reduced-data: reduce)')],
  ['coarse pointer interactions are supported', responsiveCss.includes('(pointer: coarse)')],
];

const failures = requirements.filter(([, passed]) => !passed);

for (const [name, passed] of requirements) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`);
}

if (failures.length > 0) {
  console.error(`Responsive validation failed with ${failures.length} unmet requirement(s).`);
  process.exit(1);
}

console.log(`Responsive validation passed with ${requirements.length} checks.`);
