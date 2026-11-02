// 관리자 계정을 새로 만들거나(이미 있으면 비밀번호를 새로 정함) 관리자 권한을 주는 스크립트
//
// 사용법 (gcloud 가 프로젝트 소유자 계정으로 로그인되어 있어야 함):
//   node scripts/create-admin.js                 → 아이디 nowonadmin, 비밀번호는 무작위로 만들어 화면에 보여 줌
//   node scripts/create-admin.js 아이디 비밀번호   → 원하는 아이디·비밀번호로
//
// 만드는 것: 로그인 계정(이메일 아이디@nowon-catholic.org) + admin 권한 표시,
//            users/{uid}, usernames/{아이디}, roles/{uid}={role:'admin'}
// 끝에 아이디 연결(usernames)이 빠진 기존 회원 수도 알려 준다 (그런 회원은 아이디로 로그인 못 함).

const { execSync } = require('child_process');
const crypto = require('crypto');

const PROJECT = 'nowon-catholic';
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;

const userId = process.argv[2] || 'nowonadmin';
const password = process.argv[3] || crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10) + '!7';
const email = `${userId}@nowon-catholic.org`;

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

const str = v => ({ stringValue: String(v) });

async function setDoc(path, fields) {
  const { status, body } = await api(`${DB}/${path}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
  if (status !== 200) throw new Error(`${path} 저장 실패: ${body.error?.message}`);
}

async function main() {
  if (password.length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.');

  // 1. 로그인 계정: 있으면 비밀번호만 새로 정하고, 없으면 만든다
  let uid;
  const found = await api(`${AUTH}/accounts:lookup`, { method: 'POST', body: JSON.stringify({ email: [email] }) });
  if (found.body.users?.length) {
    uid = found.body.users[0].localId;
    console.log(`이미 있는 계정입니다 → 비밀번호를 새로 정합니다: ${email}`);
  } else {
    const made = await api(`${AUTH}/accounts`, {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName: '관리자', emailVerified: true }),
    });
    if (made.status !== 200) throw new Error(`계정 생성 실패: ${made.body.error?.message}`);
    uid = made.body.localId;
    console.log(`계정을 만들었습니다: ${email}`);
  }

  // 2. 비밀번호·관리자 표시 (지금 배포된 버전은 이 표시로 관리자를 알아봄)
  const upd = await api(`${AUTH}/accounts:update`, {
    method: 'POST',
    body: JSON.stringify({ localId: uid, password, customAttributes: JSON.stringify({ admin: true }) }),
  });
  if (upd.status !== 200) throw new Error(`권한 설정 실패: ${upd.body.error?.message}`);

  // 3. 회원 정보·아이디 연결·역할 문서
  await setDoc(`users/${uid}`, {
    userId: str(userId), name: str('관리자'), baptismalName: str(''), email: str(email),
    role: str('member'), createdAt: str(new Date().toISOString()),
  });
  await setDoc(`usernames/${userId}`, { uid: str(uid), email: str(email) });
  await setDoc(`roles/${uid}`, { role: str('admin'), name: str('관리자'), email: str(email) });

  console.log('\n──────── 로그인 정보 ────────');
  console.log(`  아이디   : ${userId}   (또는 이메일 ${email})`);
  console.log(`  비밀번호 : ${password}`);
  console.log('  관리 화면: https://nowon-catholic.web.app/admin/  (지금 버전은 이메일로 입력)');
  console.log('─────────────────────────────');

  // 4. 일반 회원 로그인 점검: 아이디 연결이 빠진 회원
  const users = (await api(`${DB}/users?pageSize=300`)).body.documents || [];
  const names = new Set(((await api(`${DB}/usernames?pageSize=300`)).body.documents || []).map(d => decodeURIComponent(d.name.split('/').pop())));
  const missing = users.map(d => d.fields?.userId?.stringValue).filter(id => id && !names.has(id));
  console.log(`\n회원 ${users.length}명 중 아이디 연결이 없는 회원: ${missing.length}명`);
  if (missing.length) {
    console.log(`  (${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''})`);
    console.log('  이분들은 아이디로 로그인할 수 없습니다 → node scripts/migrate-usernames.js --apply 로 고칠 수 있습니다.');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
