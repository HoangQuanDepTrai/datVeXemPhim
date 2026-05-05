const express = require('express');
const router = express.Router();
const suatChieuController = require('../controllers/suatChieuController');

// Route này lấy danh sách lịch chiếu theo mã phim
router.get('/:maPhim', suatChieuController.getSuatChieuByPhim);
// Route này lấy chi tiết 1 suất chiếu cho trang chọn ghế
router.get('/thong-tin/:id', suatChieuController.getThongTin);

module.exports = router;