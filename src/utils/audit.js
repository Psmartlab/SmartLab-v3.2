import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logAction = async (userEmail, action, targetType, details) => {
  if (!userEmail) return;
  try {
    await addDoc(collection(db, 'audit_logs'), {
      user: userEmail,
      action, // e.g., 'CREATE', 'UPDATE', 'DELETE'
      target_type: targetType, // e.g., 'TASK', 'TEAM'
      details, // String describing what happened
      created_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
