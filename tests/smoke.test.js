/**
 * Gerodias PT (Hope, Inc. ERP) — Sprint 1 Automated Smoke Test Suite
 * Task ID: S1-TST-05 / S2-SM-02 Alignment
 * 
 * Verifies core application syntax, route declarations, static assets,
 * and security guards without mutating remote database state.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
let passedTests = 0;
let totalTests = 0;

function assertTest(id, name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ [${id}]\x1b[0m ${name}`);
  } else {
    console.error(`  \x1b[31m✖ [${id}]\x1b[0m ${name} — FAILED: ${details}`);
  }
}

console.log('\n======================================================');
console.log(' Gerodias PT — Automated Smoke Test Suite (S1-TST-05)');
console.log('======================================================\n');

// 1. Syntax Check
try {
  execSync('node --check index.js', { cwd: ROOT_DIR, stdio: 'pipe' });
  assertTest('SMK-SYN', 'Backend Syntax Validation (index.js)', true);
} catch (e) {
  assertTest('SMK-SYN', 'Backend Syntax Validation (index.js)', false, e.message);
}

const indexContent = fs.readFileSync(path.join(ROOT_DIR, 'index.js'), 'utf8');

// 2. SMK-001: Login page accessibility & template structure
const loginHtmlPath = path.join(ROOT_DIR, 'public', 'login.html');
const hasLoginHtml = fs.existsSync(loginHtmlPath);
const loginHtmlContent = hasLoginHtml ? fs.readFileSync(loginHtmlPath, 'utf8') : '';
assertTest(
  'SMK-001',
  'Login Page Assets (public/login.html & route)',
  hasLoginHtml && loginHtmlContent.includes('id="loginForm"') && indexContent.includes("app.get('/login'"),
  'login.html missing or missing form/route'
);

// 3. SMK-002: Login route handler presence & credential validation
const hasLoginEndpoint = indexContent.includes("app.post('/api/auth/login'");
const hasPasswordValidation = indexContent.includes('bcrypt.compare') && indexContent.includes('is_blocked');
assertTest(
  'SMK-002',
  'Login Route Handler & Validation (/api/auth/login)',
  hasLoginEndpoint && hasPasswordValidation,
  'Login endpoint or bcrypt comparison missing'
);

// 4. SMK-003: Invalid credentials & blocked status rejection
const hasBlockedCheck = indexContent.includes('user.is_blocked') && indexContent.includes('403');
const hasPendingPasswordSetup = indexContent.includes('requireSetPassword') && indexContent.includes("startsWith('$2')");
assertTest(
  'SMK-003',
  'Blocked User & First-Login Password Guard Verification',
  hasBlockedCheck && hasPendingPasswordSetup,
  'Blocked account or $2 prefix check missing'
);

// 5. SMK-004: Password Reset Flow (DBA password_reset_token alignment)
const hasResetEndpoint = indexContent.includes("app.post('/api/auth/resetPassword'");
const hasForgotEndpoint = indexContent.includes("app.post('/api/auth/forgotPassword'");
const hasResetTable = indexContent.includes('password_reset_token') && indexContent.includes('sha256');
assertTest(
  'SMK-004',
  'Password Reset Flow with SHA-256 Token Hash Alignment',
  hasResetEndpoint && hasForgotEndpoint && hasResetTable,
  'Reset endpoint, forgot password endpoint, or SHA-256 password_reset_token check missing'
);

// 6. SMK-005: Dashboard page template & metric card structure
const dashboardHtmlPath = path.join(ROOT_DIR, 'public', 'dashboard.html');
const hasDashboardHtml = fs.existsSync(dashboardHtmlPath);
const dashboardContent = hasDashboardHtml ? fs.readFileSync(dashboardHtmlPath, 'utf8') : '';
assertTest(
  'SMK-005',
  'Main Dashboard Template & Metric Tiles (public/dashboard.html)',
  hasDashboardHtml && dashboardContent.includes('class="metric-card"') && indexContent.includes("app.get('/dashboard'"),
  'dashboard.html missing or metric-card missing'
);

// 7. SMK-006: Essential navigation and role badge elements
const hasUsersHtml = fs.existsSync(path.join(ROOT_DIR, 'public', 'users.html'));
const usersContent = hasUsersHtml ? fs.readFileSync(path.join(ROOT_DIR, 'public', 'users.html'), 'utf8') : '';
const hasRightsModal = usersContent.includes('id="rightsModal"');
const hasRoleHideLogic = usersContent.includes('updateRoleSelectVisibility');
assertTest(
  'SMK-006',
  'User Management & Role-Based UI Controls (public/users.html)',
  hasUsersHtml && hasRightsModal && hasRoleHideLogic,
  'users.html, rightsModal, or updateRoleSelectVisibility missing'
);

// 8. SMK-007: Server-side RBAC Permission Middleware & Normalized Schema
const hasCheckPerm = indexContent.includes('function checkPermission(');
const hasSuperadminBypass = indexContent.includes('isSuperadminRole');
const hasUserPermJoin = indexContent.includes('user_permission') && indexContent.includes('rights');
assertTest(
  'SMK-007',
  'Server-Side Permission Middleware (checkPermission & user_permission)',
  hasCheckPerm && hasSuperadminBypass && hasUserPermJoin,
  'checkPermission, superadmin bypass, or user_permission schema integration missing'
);

// 9. SMK-008: Logout endpoint session destruction & cookie clearing
const hasLogoutEndpoint = indexContent.includes("app.post('/api/auth/logout'") || indexContent.includes('app.post("/api/auth/logout"');
const hasCookieClear = indexContent.includes('res.clearCookie("connect.sid"');
const hasSessionDestroy = indexContent.includes('req.session.destroy');
assertTest(
  'SMK-008',
  'Logout Endpoint Session Lifecycle (/api/auth/logout)',
  hasLogoutEndpoint && hasCookieClear && hasSessionDestroy,
  'Logout endpoint, cookie clear, or session destroy missing'
);

console.log('\n------------------------------------------------------');
console.log(` Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('------------------------------------------------------\n');

if (passedTests === totalTests) {
  console.log('\x1b[32m✔ All Sprint 1 Smoke Test Scenarios Passed Successfully.\x1b[0m\n');
  process.exit(0);
} else {
  console.error('\x1b[31m✖ Some Smoke Test Scenarios Failed.\x1b[0m\n');
  process.exit(1);
}
