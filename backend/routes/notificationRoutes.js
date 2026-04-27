import express from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import {
  getDeviceTokens,
  patchDeviceToken,
  registerDeviceToken,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(verifyToken);

router.get('/device-tokens', getDeviceTokens);
router.post('/device-tokens', registerDeviceToken);
router.patch('/device-tokens/:tokenId', patchDeviceToken);

export default router;
