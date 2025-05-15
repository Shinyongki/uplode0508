const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');
const { getOrganizations } = require('../../services/sheetService');

// 기관 목록 가져오기 API
router.get('/organizations/sheet', ensureAuthenticated, async (req, res) => {
  try {
    const organizations = await getOrganizations();
    res.json({
      status: 'success',
      data: { organizations }
    });
  } catch (error) {
    console.error('기관 목록 가져오기 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '기관 목록을 가져오는데 실패했습니다.'
    });
  }
});

module.exports = router; 