// file: routes/homeRouter.js
const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Trang chủ
router.get('/', homeController.getHomePage);

// Trang Rạp chiếu
router.get('/rap-chieu', homeController.getRapChieuPage);

// Trang Review phim (Lấy danh sách review hiện ra trang)
router.get('/review-phim', homeController.getReviewPage);

// [ĐÃ SỬA] Thay thế bằng API để nhận data Đánh giá bằng AJAX
router.post('/api/phim/danh-gia', homeController.submitReviewAPI);

module.exports = router;