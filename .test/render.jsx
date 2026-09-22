import { renderToString } from 'react-dom/server';
import Admin from '../src/admin/Admin.jsx';
import Site from '../src/site/Site.jsx';
import seed from '../data/seed.json';

const out = {};
try {
  out.site = renderToString(<Site c={seed} />).length;
} catch (e) { out.siteError = e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n'); }
try {
  out.adminLogin = renderToString(
    <Admin content={seed} setContent={() => {}} onExit={() => {}} loaded />
  ).length;
} catch (e) { out.adminError = e.message + '\n' + (e.stack||'').split('\n').slice(0,6).join('\n'); }
console.log(JSON.stringify(out, null, 2));
