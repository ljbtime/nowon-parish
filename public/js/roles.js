// 로그인한 사람의 역할: 'admin' | 'editor' | null
// 관리자: 기존 admin claim 또는 roles/{uid}.role == 'admin' (firestore.rules 와 같은 기준)
import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function getRole(user) {
  if (!user) return null;
  const token = await user.getIdTokenResult();
  if (token.claims.admin) return 'admin';
  try {
    const snap = await getDoc(doc(db, 'roles', user.uid));
    return snap.exists() ? snap.data().role : null;
  } catch {
    return null;
  }
}

export const canEdit = role => role === 'admin' || role === 'editor';

export const ROLE_NAMES = { admin: '관리자', editor: '편집자' };
