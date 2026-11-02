const admin = require('firebase-admin');

// Use application default credentials via Firebase CLI
process.env.GOOGLE_APPLICATION_CREDENTIALS = '';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'nowon-catholic'
});

const db = admin.firestore();

async function main() {
  // 김종욱 문서 찾아서 role 업데이트
  const snap = await db.collection('clergy').where('name', '==', '김종욱').get();
  if (snap.empty) {
    console.log('김종욱 문서를 찾지 못했습니다.');
  } else {
    for (const doc of snap.docs) {
      await doc.ref.update({ role: '보좌신부' });
      console.log('업데이트 완료:', doc.id, '→ 보좌신부');
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
