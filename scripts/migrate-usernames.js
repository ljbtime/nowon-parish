// 기존 회원의 아이디 → 이메일 연결(usernames/{아이디})을 만드는 일회용 스크립트
//
// 사용법 (gcloud 가 프로젝트 소유자 계정으로 로그인되어 있어야 함):
//   node scripts/migrate-usernames.js          → 점검만 (아무것도 쓰지 않음)
//   node scripts/migrate-usernames.js --apply  → 실제로 생성 (이미 있는 것은 건드리지 않음)
//
// 관리자 권한(admin claim)이 있는 계정 목록도 함께 보여 준다.

const { execSync } = require('child_process');

const PROJECT = 'nowon-catholic';
const APPLY = process.argv.includes('--apply');
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const token = execSync('gcloud auth print-access-token', { shell: true }).toString().trim();
const headers = {
  Authorization: `Bearer ${token}`,
  'x-goog-user-project': PROJECT,
  'Content-Type': 'application/json',
};

async function api(url, opts = {}) {
  const res = await fetch(url, { headers, ...opts });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function listUsers() {
  const users = [];
  let pageToken = '';
  do {
    const url = `${DB}/users?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const { status, body } = await api(url);
    if (status !== 200) throw new Error(`users 조회 실패: ${JSON.stringify(body)}`);
    for (const d of body.documents || []) {
      users.push({
        uid: d.name.split('/').pop(),
        userId: d.fields?.userId?.stringValue,
        email: d.fields?.email?.stringValue,
      });
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return users;
}

async function listAdmins() {
  const { status, body } = await api(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`,
    { method: 'POST', body: JSON.stringify({ returnUserInfo: true, limit: '1000' }) },
  );
  if (status !== 200) return `(조회 실패: ${body.error?.message})`;
  return (body.userInfo || [])
    .filter(u => JSON.parse(u.customAttributes || '{}').admin === true)
    .map(u => u.email);
}

async function main() {
  const users = await listUsers();
  console.log(`회원 문서: ${users.length}명`);
  console.log('관리자 권한 계정:', await listAdmins());

  const seen = new Map();
  for (const u of users) {
    if (!u.userId || !u.email) { console.log(`  건너뜀(아이디/이메일 없음): ${u.uid}`); continue; }
    if (seen.has(u.userId)) { console.log(`  건너뜀(중복 아이디): ${u.userId} → ${u.uid}, ${seen.get(u.userId)}`); continue; }
    seen.set(u.userId, u.uid);

    if (!APPLY) { console.log(`  생성 예정: ${u.userId} → ${u.email}`); continue; }

    // documentId 지정 생성: 이미 있으면 409 로 실패 → 덮어쓰지 않음
    const { status, body } = await api(`${DB}/usernames?documentId=${encodeURIComponent(u.userId)}`, {
      method: 'POST',
      body: JSON.stringify({ fields: { uid: { stringValue: u.uid }, email: { stringValue: u.email } } }),
    });
    if (status === 200) console.log(`  생성: ${u.userId}`);
    else if (status === 409) console.log(`  이미 있음: ${u.userId}`);
    else console.log(`  실패: ${u.userId} ${body.error?.message}`);
  }
  if (!APPLY) console.log('\n점검만 했습니다. 실제로 만들려면 --apply 를 붙여 다시 실행하세요.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
