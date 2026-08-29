import express from 'express';
import { getWorkers, getWorker, createWorker, updateWorker, deleteWorker, getWorkerStats } from '../controllers/workerController.js';
import { authenticate, authorize, authorizeMine } from '../middleware/auth.js';
import { validateWorkerInput } from '../middleware/validation.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'supervisor', 'viewer'), getWorkers);
router.get('/stats', authorize('admin', 'supervisor', 'viewer'), getWorkerStats);
router.get('/:id', authorize('admin', 'supervisor', 'viewer'), getWorker);
router.post('/', authorize('admin', 'supervisor'), validateWorkerInput, auditLog('CREATE_WORKER', 'worker'), createWorker);
router.patch('/:id', authorize('admin', 'supervisor'), auditLog('UPDATE_WORKER', 'worker'), updateWorker);
router.delete('/:id', authorize('admin'), auditLog('DELETE_WORKER', 'worker'), deleteWorker);

export default router;