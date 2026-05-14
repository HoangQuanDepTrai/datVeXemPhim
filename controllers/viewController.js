const hoadonModel = require('../models/hoadon');
const { poolPromise } = require('../config/db');

class ViewController {
    // Render trang Đăng nhập
    renderLogin(req, res) {
        res.render('login');
    }

    // Render trang Đăng ký
    renderRegister(req, res) {
        res.render('register');
    }

    // Render trang Profile cá nhân
    renderProfile(req, res) {
        if (!req.session.user) return res.redirect('/login');
        res.render('profile', { user: req.session.user });
    }

    // Render trang Chi tiết phim
    renderChiTietPhim(req, res) {
        res.render('chitietphim');
    }

    // Render trang Đặt vé
    renderDatVe(req, res) {
        res.render('datve');
    }

    // Render sơ đồ ghế
    renderSoDoGhe(req, res) {
        res.render('sodoghe');
    }

    // Render trang thanh toán (Lưu ý: veRouter cũng có thể có, mình gộp về đây cho đồng nhất giao diện)
    renderThanhToan(req, res) {
        res.render('thanhtoan');
    }

    // Lấy tất cả phim và render ra trang Tất Cả Phim
    async renderTatCaPhim(req, res) {
        try {
            const pool = await poolPromise;
            // Tốt nhất là chuyển query này vào phimModel, nhưng để giữ nguyên logic cũ:
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

            res.render('tatcaphim', {
                movies: result.recordset
            });
        } catch (err) {
            console.error("Lỗi lấy danh sách tất cả phim:", err.message);
            res.render('tatcaphim', { movies: [] });
        }
    }

    // Lịch sử mua hàng
    async renderLichSu(req, res) {
        const maND = req.query.maND;
        if (maND) {
            try {
                const dataLichSu = await hoadonModel.getLichSuByMaND(maND);
                res.render('lichsu', { lichSu: dataLichSu });
            } catch (error) {
                console.error("Lỗi lấy lịch sử:", error.message);
                res.render('lichsu', { lichSu: [] });
            }
        } else {
            res.render('lichsu', { lichSu: null });
        }
    }

    // In vé sau khi mua
    async renderInVe(req, res) {
        try {
            const maHD = req.params.maHD;
            const danhSachVe = await hoadonModel.getDanhSachVeDeIn(maHD);

            if (danhSachVe && danhSachVe.length > 0) {
                res.render('print_ve', { danhSachVe: danhSachVe });
            } else {
                res.status(404).send("Không tìm thấy vé nào cho hóa đơn này.");
            }
        } catch (err) {
            res.status(500).send("Lỗi server");
        }
    }
}

module.exports = new ViewController();
