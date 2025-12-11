/**
 * Firebase Admin SDK Configuration
 * Initializes Firebase Admin for server-side authentication and Firestore access
 */

const admin = require('firebase-admin');

let db = null;
let initialized = false;

/**
 * Initialize Firebase Admin SDK
 * Reads FIREBASE_SERVICE_ACCOUNT from environment variables
 * Can be either a JSON string or a file path
 */
function initializeFirebaseAdmin() {
  if (initialized) {
    return { admin, db };
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT not configured. Firestore features will be disabled.');
    return { admin: null, db: null };
  }

  try {
    let credential;

    // Try to parse as JSON string first
    if (serviceAccount.trim().startsWith('{')) {
      try {
        const serviceAccountObj = JSON.parse(serviceAccount);
        credential = admin.credential.cert(serviceAccountObj);
      } catch (parseError) {
        console.error('[Firebase Admin] Failed to parse service account JSON:', parseError.message);
        throw new Error('Invalid service account JSON format');
      }
    } else {
      // Treat as file path
      credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp({
      credential: credential
    });

    db = admin.firestore();
    initialized = true;

    console.log('[Firebase Admin] Successfully initialized');
    return { admin, db };
  } catch (error) {
    console.error('[Firebase Admin] Failed to initialize:', error.message);
    console.warn('[Firebase Admin] Firestore features will be disabled.');
    return { admin: null, db: null };
  }
}

// Initialize on module load
const { admin: adminInstance, db: dbInstance } = initializeFirebaseAdmin();

module.exports = {
  admin: adminInstance,
  db: dbInstance,
  isInitialized: () => initialized
};
