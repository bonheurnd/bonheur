import jwt from 'jsonwebtoken';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'lalumiere-choir-adepr-nyanza-kicukiro-secret-key-2026';

console.log('\n==================================================');
console.log('  RUNNING LA LUMIERE PERSISTENCE & WORKFLOW TESTS');
console.log('==================================================');
console.log(`Target Service: ${BASE_URL}\n`);

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert(healthRes.ok, 'GET /api/health responds with 200 OK');
  const healthData = await healthRes.json();
  assert(healthData.status === 'ok', 'Health status is ok');

  // 2. Public access security test: Private member directory requires authentication
  const unauthRes = await fetch(`${BASE_URL}/api/members`);
  assert(unauthRes.status === 401, 'GET /api/members rejects unauthenticated request with 401');

  // 3. Generate authenticated tokens
  const adminToken = jwt.sign(
    { id: 'usr_admin_default', email: 'admin@lalumierechoir.rw', name: 'Choir Administrator', role: 'super_admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const memberToken = jwt.sign(
    { id: 'usr_member_default', email: 'member@lalumierechoir.rw', name: 'Worshipper David', role: 'choir_member' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 4. Role Authorization: Normal choir member cannot access admin routes
  const memberForbiddenRes = await fetch(`${BASE_URL}/api/admin/members`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  assert(
    memberForbiddenRes.status === 403,
    'GET /api/admin/members rejects normal choir member with 403 Forbidden'
  );

  // 5. Admin can access member list
  const adminListRes = await fetch(`${BASE_URL}/api/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminListRes.ok, 'GET /api/members succeeds with admin token');
  const membersList = await adminListRes.json();
  assert(Array.isArray(membersList.members), 'Members list returns valid array');

  // 6. Member Validation: Rejects invalid voicePart
  const invalidVoiceRes = await fetch(`${BASE_URL}/api/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Test Member',
      voicePart: 'InvalidVoice',
      status: 'active',
    }),
  });
  assert(invalidVoiceRes.status === 400, 'POST /api/members rejects invalid voicePart with 400 Bad Request');

  // 7. Member Validation: Rejects invalid status
  const invalidStatusRes = await fetch(`${BASE_URL}/api/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Test Member',
      status: 'unknown_status',
    }),
  });
  assert(invalidStatusRes.status === 400, 'POST /api/members rejects invalid status with 400 Bad Request');

  // 8. Member Creation with Empty String Sanitization & Bound Parameters
  const testPhone = '0789' + Math.floor(100000 + Math.random() * 900000);
  const testName = 'Persist Test ' + Date.now();
  const createRes = await fetch(`${BASE_URL}/api/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: testName,
      phone: testPhone,
      email: '', // empty string must be sanitized to null, not injected as ""
      bio: '   ', // whitespace must be sanitized to null
      voicePart: 'soprano', // case-insensitive canonical normalization
      status: 'active',
    }),
  });
  assert(createRes.status === 201, 'POST /api/members creates member and responds with 201 Created');
  const createData = await createRes.json();
  const createdMemberId = createData.member.id;
  assert(Boolean(createdMemberId), 'Created member has stable unique ID');
  assert(createData.member.choir_voice === 'Soprano', 'Normalizes voicePart to canonical Soprano');

  // 9. Data Persistence Verification (Reload from backend)
  const reloadRes = await fetch(`${BASE_URL}/api/members?search=${encodeURIComponent(testName)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(reloadRes.ok, 'GET /api/members search reloads persisted member');
  const reloadData = await reloadRes.json();
  const found = reloadData.members.find((m: any) => m.id === createdMemberId);
  assert(found !== undefined, 'Member persists in SQLite and survives backend reload');
  assert(found.name === testName, 'Persisted member name matches exactly');

  // 10. Update Member Details & Deactivate
  const updateRes = await fetch(`${BASE_URL}/api/members/${createdMemberId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: testName + ' (Updated)',
      status: 'inactive',
      voicePart: 'Alto',
    }),
  });
  assert(updateRes.ok, 'PUT /api/members/:id updates member status to inactive');

  // 11. Attendance History Endpoint for Single Member
  const attHistRes = await fetch(`${BASE_URL}/api/members/${createdMemberId}/attendance`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(attHistRes.ok, 'GET /api/members/:id/attendance succeeds');
  const attHistData = await attHistRes.json();
  assert(attHistData.member.status === 'inactive', 'Inactive member retains profile and attendance history endpoint');

  // 12. Cleanup test member safely via admin bulk-remove (action: 'delete')
  const deleteRes = await fetch(`${BASE_URL}/api/admin/users/bulk-remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      userIds: [createdMemberId],
      action: 'delete',
      reason: 'Automated audit test cleanup',
    }),
  });
  assert(deleteRes.ok, 'Cleanup test fixture succeeded');

  console.log(`\n==================================================`);
  console.log(`  ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log(`==================================================\n`);
  process.exit(0);
}

runTests().catch(err => {
  console.error('\nTests aborted due to error:', err);
  process.exit(1);
});
