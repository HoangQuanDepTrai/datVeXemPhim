const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');

// Đăng nhập & Đăng ký
router.get('/login', viewController.renderLogin);
router.get('/register', viewController.renderRegister);
// Profile
router.get('/profile', viewController.renderProfile);
// Đặt vé & Chi tiết phim
router.get('/chitietphim', viewController.renderChiTietPhim);
router.get('/datve', viewController.renderDatVe);
router.get('/sodoghe', viewController.renderSoDoGhe);
router.get('/thanhtoan', viewController.renderThanhToan);
// Tất cả phim
router.get('/tat-ca-phim', viewController.renderTatCaPhim);

// Lịch sử mua hàng
router.get('/lich-su', viewController.renderLichSu);

// In vé
router.get('/in-ve/:maHD', viewController.renderInVe);

module.exports = router;
