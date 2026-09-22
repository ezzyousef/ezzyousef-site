import { renderToString } from 'react-dom/server';
import Admin from './AdminTabs.jsx';
import seed from '../data/seed.json';

const tabs = ['theme','hero','stats','research','publications','software','experience','background','contact','nav','meta'];
let failures = 0;
for (const tab of tabs) {
  try {
    const n = renderToString(<Admin content={seed} setContent={() => {}} onExit={() => {}} startTab={tab} />).length;
    console.log(`  ok    ${tab.padEnd(14)} ${n} chars`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${tab.padEnd(14)} ${e.message}`);
    console.log('        ' + (e.stack || '').split('\n').slice(1, 4).join('\n        '));
  }
}
console.log(failures ? `\n${failures} tab(s) crash on render` : '\nall tabs render');
