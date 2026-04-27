import {
  listUserDeviceTokens,
  registerUserDeviceToken,
  updateUserDeviceToken,
} from '../services/notificationService.js';

const getDeviceTokens = async (req, res) => {
  try {
    const uid = req.user.uid;
    const tokens = await listUserDeviceTokens({ userId: uid });

    return res.json({
      success: true,
      tokens: tokens.map((token) => ({
        tokenId: token.tokenId,
        provider: token.provider,
        platform: token.platform,
        active: token.active,
        lastSeenAt: token.lastSeenAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
      })),
    });
  } catch (error) {
    console.error('List device tokens error:', error);
    return res.status(500).json({
      error: 'Failed to fetch device tokens',
      message: error.message,
    });
  }
};

const registerDeviceToken = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { token, platform, provider } = req.body || {};

    if (!token || String(token).trim() === '') {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const result = await registerUserDeviceToken({
      userId: uid,
      token,
      platform: platform || 'web',
      provider: provider || 'fcm',
    });

    return res.status(result.created ? 201 : 200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Register device token error:', error);
    return res.status(500).json({
      error: 'Failed to register device token',
      message: error.message,
    });
  }
};

const patchDeviceToken = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { tokenId } = req.params;
    const { active, platform, provider } = req.body || {};

    const result = await updateUserDeviceToken({
      tokenId,
      userId: uid,
      active,
      platform,
      provider,
    });

    return res.json({
      success: true,
      tokenId,
      record: result,
    });
  } catch (error) {
    if (error.message === 'Token not found') {
      return res.status(404).json({ error: 'Device token not found' });
    }
    if (error.message === 'Not authorized to update this token') {
      return res.status(403).json({ error: 'Not authorized to update this token' });
    }

    console.error('Update device token error:', error);
    return res.status(500).json({
      error: 'Failed to update device token',
      message: error.message,
    });
  }
};

export {
  getDeviceTokens,
  registerDeviceToken,
  patchDeviceToken,
};
