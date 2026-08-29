import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  mineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mine'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_ATTENDANCE',
      'UPDATE_ATTENDANCE',
      'DELETE_ATTENDANCE',
      'BULK_CREATE_ATTENDANCE',
      'BULK_UPDATE_ATTENDANCE',
      'BULK_DELETE_ATTENDANCE',
      'CREATE_WORKER',
      'UPDATE_WORKER',
      'DELETE_WORKER',
      'IMPORT_WORKERS',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'LOGIN',
      'LOGOUT',
      'EXPORT_EXCEL',
      'EXPORT_CSV'
    ]
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['attendance', 'worker', 'user', 'export']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ mineId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);