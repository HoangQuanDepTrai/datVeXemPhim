const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors');
const path = require('path');
require('dotenv').config();

const app = express();
const { poolPromise } = require('./config/db');

// 1. Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Thêm vào app.js
app.get('/thanhtoan', (req, res) => res.render('thanhtoan'));

// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
const session = require('express-session');

app.use(session({
    secret: 'DuyMovieSecretKey123!@#', // Khóa bảo mật (có thể đổi)
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // Thời gian sống 1 ngày
}));

// Middleware đẩy biến user ra toàn bộ các file giao diện (.ejs)
app.use((req, res, next) => {
    // Biến res.locals.user sẽ tự động xuất hiện ở mọi file HTML
    res.locals.user = req.session.user || null;
    next();
});

// 3. Import Models & Routers
// LƯU Ý: Chỉ khai báo hoadonModel DUY NHẤT 1 lần ở đây
const hoadonModel = require('./models/hoadon');
const phimRouter = require('./routers/phimRouter');
const suatChieuRouter = require('./routers/suatChieuRouter');
const authRouter = require('./routers/authRouter');
const gheRouter = require('./routers/gheRouter');
const veRouter = require('./routers/veRouter');
const adminRouter = require('./routers/adminRouter');
const sanPhamRouter = require('./routers/sanphamRouter');
const homeRouter = require('./routers/homeRouter');

// --- ROUTES GIAO DIỆN (VIEW ROUTES) ---
app.get('/login', (req, res) => res.render('login'));
app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('profile', { user: req.session.user });
});
app.get('/register', (req, res) => res.render('register'));
app.get('/chitietphim', (req, res) => res.render('chitietphim'));
app.get('/datve', (req, res) => res.render('datve'));
app.get('/sodoghe', (req, res) => res.render('sodoghe'));
app.get('/admin', (req, res) => res.render('admin/dashboard'));

// ROUTE LỊCH SỬ (SỬ DỤNG hoadonModel)
app.get('/lich-su', async (req, res) => {
    const maND = req.query.maND;
    if (maND) {
        try {
            const dataLichSu = await hoadonModel.getLichSuByMaND(maND);
            console.log(`\n=== DỮ LIỆU LỊCH SỬ CỦA USER ID: ${maND} ===`.cyan);
            console.log(dataLichSu);
            res.render('lichsu', { lichSu: dataLichSu });
        } catch (error) {
            console.error("Lỗi lấy lịch sử:", error.message);
            res.render('lichsu', { lichSu: [] });
        }
    } else {
        res.render('lichsu', { lichSu: null });
    }
});
// ROUTE TRANG TẤT CẢ PHIM
app.get('/tat-ca-phim', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Truy vấn lấy TẤT CẢ phim thay vì chỉ TOP 5 như trang chủ
        const result = await pool.request().query(`
            SELECT 
                MA_PHIM, 
                TEN_PHIM, 
                NOI_DUNG_PHIM, 
                GIOI_HAN_TUOI, 
                HINH_ANH_NEN 
            FROM PHIM 
            ORDER BY MA_PHIM DESC
        `);

        // Truyền dữ liệu sang file tatcaphim.ejs với biến tên là 'movies'
        res.render('tatcaphim', {
            movies: result.recordset
        });
    } catch (err) {
        console.error("Lỗi lấy danh sách tất cả phim:", err.message);
        res.render('tatcaphim', { movies: [] });
    }
});

// ROUTE TRANG IN VÉ (TRANG QUÉT MÃ QR TRỎ VỀ)
app.get('/in-ve/:maHD', async (req, res) => {
    try {
        const maHD = req.params.maHD;
        const danhSachVe = await hoadonModel.getDanhSachVeDeIn(maHD);

        if (danhSachVe && danhSachVe.length > 0) {
            // Truyền 'danhSachVe' (mảng) thay vì 've' (đối tượng đơn)
            res.render('print_ve', { danhSachVe: danhSachVe });
        } else {
            res.status(404).send("Không tìm thấy vé nào cho hóa đơn này.");
        }
    } catch (err) {
        res.status(500).send("Lỗi server");
    }
});

// --- API ROUTES ---

// API Lấy chi tiết hóa đơn (cho Modal)
app.get('/api/hoa-don/chi-tiet/:maHD', async (req, res) => {
    try {
        const maHD = req.params.maHD;
        const chiTiet = await hoadonModel.getChiTietHoaDon(maHD);
        if (chiTiet) {
            res.json({ success: true, data: chiTiet });
        } else {
            res.json({ success: false, message: "Không tìm thấy dữ liệu" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use('/api/phim', phimRouter);
app.use('/api/suat-chieu', suatChieuRouter);
app.use('/api/auth', authRouter);
app.use('/api/ve', veRouter);
app.use('/api/ghe', gheRouter);
app.use('/api', sanPhamRouter);
app.use('/admin', adminRouter);
app.use('/', homeRouter);

// --- START SERVER ---
const PORT = process.env.PORT || 5000;

app.use((req, res) => {
    res.status(404).render('404');
});

app.listen(PORT, async () => {
    console.log(`Server running at: http://localhost:${PORT}`.green);
    try {
        await poolPromise;
        console.log('Kết nối CSDL SQL Server thành công!'.blue);
    } catch (err) {
        console.error('Lỗi kết nối CSDL khi khởi động!'.red, err.message);
    }
});