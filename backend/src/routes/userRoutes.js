import express from 'express';
import { getUsers, getUser, createUser, updateUser, changePassword, deleteUser, getAuditLogs } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUserInput } from '../middleware/validation.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'supervisor'), getUsers);
router.get('/audit-logs', authorize('admin'), getAuditLogs);
router.get('/:id', authorize('admin', 'supervisor'), getUser);
router.post('/', authorize('admin'), validateUserInput, auditLog('CREATE_USER', 'user'), createUser);
router.patch('/:id', authorize('admin'), auditLog('UPDATE_USER', 'user'), updateUser);
router.patch('/change-password', changePassword);
router.delete('/:id', authorize('admin'), auditLog('DELETE_USER', 'user'), deleteUser);

export default router;