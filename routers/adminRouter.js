const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const statisticController = require('../controllers/statisticController');

// --- Quản lý Phim ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/image/'),
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
router.put('/phim/hide/:id', adminController.hidePhim);
router.get('/thong-ke', statisticController.getRevenueStatistics);
// --- Quản lý Suất chiếu ---
router.get('/suat-chieu', adminController.listSuatChieu);
router.post('/suat-chieu/add', adminController.addSuatChieu);
router.get('/suat-chieu/delete/:id', adminController.deleteSuatChieu);

router.get('/doanh-thu', adminController.getDashboard);

router.get('/users', adminController.listUsers);

router.get('/hoa-don', adminController.listHoaDon);
// Bạn nhớ require adminController vào nhé
router.get('/tool-cao-phim', adminController.autoImportPhim);
// --- Quản lý Phòng & Ghế ---
router.get('/phong', adminController.listPhong);
router.post('/phong/add', adminController.addPhongVaGhe);
//--- Quản lý Rạp ---
router.get('/rap', adminController.listRap);
router.post('/rap/add', adminController.addRap);
router.post('/rap/toggle/:id', adminController.toggleRap);

// --- API cho giao diện ---
router.get('/phong/:id/ghe', adminController.getSoDoGhe);
router.get('/api/phongs-by-rap/:maRap', adminController.getPhongsByRap);

module.exports = router;