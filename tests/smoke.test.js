const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const splash = fs.readFileSync(path.join(root, 'public', 'splashindex.html'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

let passed = 0;
const total = 9;

function check(name, condition) {
  if (!condition) {
    console.error(`✖ ${name}`);
    return;
  }
  passed++;
  console.log(`✔ ${name}`);
}

try {
  execFileSync(process.execPath, ['--check', path.join(root, 'index.js')], { stdio: 'pipe' });
  check('index.js syntax', true);
} catch (error) {
  check('index.js syntax', false);
}

check(
  'auth page aliases are removed while modal APIs remain',
  !/app\.get\(\[\s*['"]\/login['"]/.test(index)
    && splash.includes('id="loginView"')
    && index.includes("app.post('/api/auth/forgotPassword'")
    && index.includes("app.post('/api/auth/resetPassword'")
    && index.includes("app.post('/api/auth/login'")
    && index.includes('app.post("/api/auth/register"')
);

check(
  'manager block guard only denies non-staff targets',
  index.includes("if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name))")
);

check(
  'RBAC module aliases and action map are present',
  index.includes('const PERMISSION_MODULE_ALIASES =')
    && index.includes('const ACTION_CODE_MAP =')
    && index.includes('async function getUserRightsMap(')
);

check(
  'RBAC middleware reads normalized and legacy permission data',
  index.includes('function checkPermission(')
    && index.includes(".from('user_permission')")
    && index.includes(".from('user_rights')")
);

check(
  'forgot and reset password APIs are connected to the reset-token table',
  index.includes("app.post('/api/auth/forgotPassword'")
    && index.includes("app.post('/api/auth/resetPassword'")
    && index.includes("from('password_reset_token')")
    && index.includes("createHash('sha256')")
);

check(
  'splash password reset forms call the APIs',
  splash.includes("fetch('/api/auth/forgotPassword'")
    && splash.includes("fetch('/api/auth/resetPassword'")
);

check(
  'Vercel config routes to the exported Express application',
  vercel.builds.some(build => build.src === 'index.js' && build.use === '@vercel/node')
    && vercel.routes.some(route => route.dest === 'index.js')
    && index.includes('module.exports = app;')
);

check(
  'logout destroys the session and clears its cookie',
  index.includes('req.session.destroy')
    && index.includes('res.clearCookie("connect.sid"')
);

console.log(`Results: ${passed}/${total} smoke checks passed.`);
if (passed !== total) process.exitCode = 1;
