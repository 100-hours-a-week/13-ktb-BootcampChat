const express = require('express');
const router = express.Router();
const { getCacheStats } = require('../../services/redisMessageService'); // 경로는 현재 위치에 따라 조정

// 캐시 상태 확인용 API
router.get('/cache', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('캐시 상태 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '캐시 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
