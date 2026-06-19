import express from 'express';
import { 
  getDashboardStats, 
  getAllSOS, 
  getLocalityAnalytics,
  getUsersForModeration,
  suspendUser, 
  unsuspendUser 
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../constant.js';

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.get('/stats', getDashboardStats);
router.get('/sos', getAllSOS);
router.get('/locality-analytics', getLocalityAnalytics);
router.get('/users', getUsersForModeration);
router.put('/users/:userId/suspend', suspendUser);
router.put('/users/:userId/unsuspend', unsuspendUser);

export default router;
