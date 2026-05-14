const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const statisticController = require('../controllers/statisticController');
// --- Dashboard Chính ---
router.get('/', adminController.renderDashboardHome);

// --- Quản lý Phim ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/images/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });
// 2. Định nghĩa các trường file nhận từ Form (Vẫn dùng tốt!)
const uploadFields = upload.fields([
    { name: 'posterFile', maxCount: 1 }, // Nhận 1 file từ input name="posterFile"
    { name: 'nenFile', maxCount: 1 }    // Nhận 1 file từ input name="nenFile"
]);
router.get('/phim', adminController.listPhim);
router.post('/phim/add', uploadFields, adminController.addPhim);
router.post('/phim/update-status/:id', adminController.updateMovieStatus);
router.get('/thong-ke', statisticController.getRevenueStatistics);
// --- Quản lý Suất chiếu ---
router.get('/suat-chieu', adminController.listSuatChieu);
router.post('/suat-chieu/add', adminController.addSuatChieu);
router.get('/suat-chieu/delete/:id', adminController.deleteSuatChieu);

// --- Quản lý Người dùng & Hóa đơn ---
router.get('/nguoidung', adminController.listUsers);
router.get('/hoa-don', adminController.listHoaDon);
router.post('/nguoidung/khoa-mo', adminController.khoaMoTaiKhoan);
// --- Thống kê doanh thu ---
router.get('/doanh-thu', adminController.getDashboard);
// --- Quản lý Phòng & Ghế ---
router.get('/phong', adminController.listPhong);
router.post('/phong/add', adminController.addPhongVaGhe);
router.get('/phong/:id/ghe', adminController.getSoDoGhe);
router.get('/api/phongs-by-rap/:maRap', adminController.getPhongsByRap);
router.post('/ghe/update-status', adminController.updateGheStatus);
router.post('/ghe/generate-custom', adminController.generateCustomSeats);
//--- Quản lý Rạp ---
router.get('/rap', adminController.listRap);
router.post('/rap/add', adminController.addRap);
router.post('/rap/toggle/:id', adminController.toggleRap);
// Bạn nhớ require adminController vào nhé
router.get('/tool-cao-phim', adminController.autoImportPhim);

module.exports = router;