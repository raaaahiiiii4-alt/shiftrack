import AuditLog from '../models/AuditLog.js';

export const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = async function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const logData = {
            userId: req.userId || req.user?._id,
            userEmail: req.user?.email || 'unknown',
            mineId: req.mineId || req.body?.mineId || req.params?.mineId || req.query?.mineId,
            action,
            resourceType,
            resourceId: req.params?.id || req.body?._id,
            details: {
              method: req.method,
              url: req.originalUrl,
              body: sanitizeBody(req.body),
              params: req.params,
              query: req.query
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent')
          };

          await AuditLog.create(logData);
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }
      return originalSend.call(this, body);
    };
    
    next();
  };
};

const sanitizeBody = (body) => {
  if (!body) return {};
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.refreshToken;
  return sanitized;
};