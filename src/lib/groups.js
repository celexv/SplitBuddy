import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';

export async function createGroup(name, members, creatorUid, creatorName) {
  // Include ALL registered members' UIDs (not just creator) so they can query their groups
  const memberUids = members
    .filter((m) => m.uid)    // guests have uid === null, skip them
    .map((m) => m.uid);
  if (!memberUids.includes(creatorUid)) memberUids.unshift(creatorUid);

  const groupData = {
    name,
    createdBy: creatorUid,
    createdByName: creatorName,
    createdAt: serverTimestamp(),
    memberUids,
    members,
  };
  const ref = await addDoc(collection(db, 'groups'), groupData);
  return ref.id;
}

export async function getGroup(groupId) {
  const ref = doc(db, 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getUserGroups(uid) {
  const q = query(
    collection(db, 'groups'),
    where('memberUids', 'array-contains', uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteGroup(groupId) {
  // Delete all expenses in the group first
  const expSnap = await getDocs(collection(db, 'groups', groupId, 'expenses'));
  const delPromises = expSnap.docs.map((d) =>
    deleteDoc(doc(db, 'groups', groupId, 'expenses', d.id))
  );
  await Promise.all(delPromises);
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function searchUsersByEmail(email) {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateGroupName(groupId, newName) {
  const ref = doc(db, 'groups', groupId);
  await updateDoc(ref, { name: newName });
}

