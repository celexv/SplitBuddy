import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebase';

export async function addExpense(groupId, expenseData, creatorUid) {
  const ref = await addDoc(collection(db, 'groups', groupId, 'expenses'), {
    ...expenseData,
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getGroupExpenses(groupId) {
  const q = query(
    collection(db, 'groups', groupId, 'expenses'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateExpense(groupId, expenseId, data) {
  const ref = doc(db, 'groups', groupId, 'expenses', expenseId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteExpense(groupId, expenseId) {
  await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
}
