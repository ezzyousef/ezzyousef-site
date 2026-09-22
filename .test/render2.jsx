import { renderToString } from 'react-dom/server';
import Admin from '../src/admin/Admin.jsx';
import seed from '../data/seed.json';
const html = renderToString(<Admin content={seed} setContent={() => {}} onExit={() => {}} loaded />);
// strip the inline stylesheet so the structure is readable
console.log(html.replace(/<style>[\s\S]*?<\/style>/, '<style>[CSS]</style>'));
