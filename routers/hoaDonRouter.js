const express = require('express');
const router = express.Router();
const hoaDonController = require('../controllers/hoaDonController');

// Lấy chi tiết hóa đơn (cho Modal)
router.get('/chi-tiet/:maHD', hoaDonController.getChiTietHoaDonAPI);

module.exports = router;
