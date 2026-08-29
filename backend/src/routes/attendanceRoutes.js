import express from 'express';
import {
  getAttendance,
  createAttendance,
  bulkCreateAttendance,
  updateAttendance,
  bulkUpdateAttendance,
  deleteAttendance,
  bulkDeleteAttendance,
  getMonthlyStats,
  exportMonthlyExcel,
  exportMonthlyCSV
} from '../controllers/attendanceController.js';
import { authenticate, authorize, authorizeMine } from '../middleware/auth.js';
import { validateAttendanceInput, validateBulkAttendanceInput, validateDateQuery } from '../middleware/validation.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'supervisor', 'viewer'), validateDateQuery, getAttendance);
router.get('/monthly-stats', authorize('admin', 'supervisor', 'viewer'), getMonthlyStats);
router.get('/export/excel', authorize('admin', 'supervisor', 'viewer'), auditLog('EXPORT_EXCEL', 'export'), exportMonthlyExcel);
router.get('/export/csv', authorize('admin', 'supervisor', 'viewer'), auditLog('EXPORT_CSV', 'export'), exportMonthlyCSV);

router.post('/', authorize('admin', 'supervisor'), validateAttendanceInput, auditLog('CREATE_ATTENDANCE', 'attendance'), createAttendance);
router.post('/bulk', authorize('admin', 'supervisor'), validateBulkAttendanceInput, auditLog('BULK_CREATE_ATTENDANCE', 'attendance'), bulkCreateAttendance);

router.patch('/:id', authorize('admin', 'supervisor'), auditLog('UPDATE_ATTENDANCE', 'attendance'), updateAttendance);
router.patch('/bulk/shift', authorize('admin', 'supervisor'), auditLog('BULK_UPDATE_ATTENDANCE', 'attendance'), bulkUpdateAttendance);

router.delete('/:id', authorize('admin', 'supervisor'), auditLog('DELETE_ATTENDANCE', 'attendance'), deleteAttendance);
router.delete('/bulk', authorize('admin', 'supervisor'), auditLog('BULK_DELETE_ATTENDANCE', 'attendance'), bulkDeleteAttendance);

export default router;