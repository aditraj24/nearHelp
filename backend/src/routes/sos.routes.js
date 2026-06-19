import express from 'express';
import { 
  createSOS, 
  resolveSOS, 
  rateResponder, 
  flagFalseAlert,
  getActiveSOS,
  getPendingSOS,
  getSOSById,
  getMyHistory,
  getPendingWelfareChecks,
  respondToWelfareCheck
} from '../controllers/sos.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createSOS);
router.get('/active', getActiveSOS);
router.get('/pending', getPendingSOS);
router.get('/history', getMyHistory);
router.get('/welfare-checks', getPendingWelfareChecks);
router.post('/:sosId/welfare-check', respondToWelfareCheck);
router.get('/:sosId', getSOSById);
router.put('/:sosId/resolve', resolveSOS);
router.post('/:sosId/rate/:responderId', rateResponder);
router.post('/:sosId/flag', flagFalseAlert);

export default router;