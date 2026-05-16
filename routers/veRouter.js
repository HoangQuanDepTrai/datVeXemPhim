// routers/veRouter.js
const express = require('express');
const router = express.Router();
const veController = require('../controllers/veController');

// 1. Trang hiện giao diện thanh toán (Cho link: /api/ve/thanhtoan?...)
router.get('/thanhtoan', (req, res) => {
    res.render('thanhtoan');
});

// 2. API xử lý lưu đơn và tạo link VNPay (Cho lệnh fetch POST trong thanhtoan.js)
router.post('/dat-ve', veController.datVe);

// 3. Xử lý khi VNPay quay về
router.get('/vnpay-return', veController.vnpayReturn);

module.exports = router;