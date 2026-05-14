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

// 3. Import Routers
const viewRouter = require('./routers/viewRouter');
const phimRouter = require('./routers/phimRouter');
const suatChieuRouter = require('./routers/suatChieuRouter');
const authRouter = require('./routers/authRouter');
const gheRouter = require('./routers/gheRouter');
const veRouter = require('./routers/veRouter');
const adminRouter = require('./routers/adminRouter');
const sanPhamRouter = require('./routers/sanphamRouter');
const homeRouter = require('./routers/homeRouter');
const hoaDonRouter = require('./routers/hoaDonRouter');

// --- ROUTES ---
app.use('/', viewRouter); // Các route giao diện cơ bản
app.use('/api/phim', phimRouter);
app.use('/api/suat-chieu', suatChieuRouter);
app.use('/api/auth', authRouter);
app.use('/api/ve', veRouter);
app.use('/api/ghe', gheRouter);
app.use('/api/hoa-don', hoaDonRouter);
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