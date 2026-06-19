import express from 'express';
import { addResource, getNearbyResources, getAllResources, seedResources } from '../controllers/resource.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/seed', seedResources);
router.post('/', addResource);
router.get('/nearby', getNearbyResources);
router.get('/', getAllResources);

export default router;