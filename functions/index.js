const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Callable function: Set custom claims for mine isolation
exports.setCustomClaims = functions.https.onCall(async (data, context) => {
  // Only allow admin users to call this
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }

  const { uid, mineId, admin } = data;
  if (!uid)
    throw new functions.https.HttpsError("invalid-argument", "uid required");

  const claims = {};
  if (mineId) claims.mineId = mineId;
  if (admin === true) claims.admin = true;

  await admin.auth().setCustomUserClaims(uid, claims);
  return { success: true, claims };
});
