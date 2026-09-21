// Usage: npm run hash -- "your-password"
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Give the password as an argument:  npm run hash -- "your-password"');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use at least 10 characters. This is the only thing protecting the dashboard.');
  process.exit(1);
}
console.log('\nADMIN_PASSWORD_HASH=' + bcrypt.hashSync(password, 12) + '\n');
console.log('Paste that whole line into the Vercel project environment variables.\n');
