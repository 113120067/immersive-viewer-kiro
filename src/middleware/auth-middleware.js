/**
 * Authentication Middleware
 * Verifies Firebase ID tokens from Authorization header
 */

const { admin } = require('../config/firebase-admin');

/**
 * Verify Firebase ID token
 * @param {Object} options - Middleware options
 * @param {boolean} options.optional - If true, allows unauthenticated requests (req.user = null)
 * @returns {Function} Express middleware
 */
function verifyIdToken(options = {}) {
  const { optional = false } = options;

  return async (req, res, next) => {
    // If Firebase Admin is not initialized, skip authentication
    if (!admin) {
      if (optional) {
        req.user = null;
        return next();
      } else {
        return res.status(500).json({
          success: false,
          error: 'Authentication is not configured on this server'
        });
      }
    }

    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (optional) {
          req.user = null;
          return next();
        } else {
          return res.status(401).json({
            success: false,
            error: 'No authentication token provided'
          });
        }
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Set user information in request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };

      next();
    } catch (error) {
      console.error('[Auth Middleware] Token verification failed:', error.message);

      if (optional) {
        req.user = null;
        return next();
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired authentication token'
        });
      }
    }
  };
}

module.exports = {
  verifyIdToken
};
