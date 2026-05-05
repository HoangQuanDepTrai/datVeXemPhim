const taiKhoanModel = require('../models/taikhoan');
const bcrypt = require('bcrypt'); // 1. Gọi thư viện bcrypt]
const sql = require('mssql');
const { poolPromise } = require('../config/db');

class AuthController {
    // --- XỬ LÝ ĐĂNG NHẬP ---
    async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập tài khoản và mật khẩu!" });
            }

            const user = await taiKhoanModel.findByUsername(username);

            if (!user) {
                return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
            }

            const isMatch = await bcrypt.compare(password, user.MAT_KHAU);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
            }

            // Lưu vào Session
            req.session.user = user;

            // Xác định đường dẫn điều hướng dựa trên vai trò
            // Giả sử: 1 là Admin, các số khác là User
            let redirectUrl = '/';
            if (user.MA_VAI_TRO == 1) { // Kiểm tra đúng tên cột trong DB của bạn (VAI_TRO hoặc vaiTro)
                redirectUrl = '/admin'; // Đường dẫn trang quản trị của bạn
            }

            // Xóa field mật khẩu cho an toàn
            delete user.MAT_KHAU;

            console.log(`🎬 [${user.MA_VAI_TRO === 1 ? 'ADMIN' : 'USER'}] ${user.HO_TEN} đã đăng nhập!`);

            res.status(200).json({
                success: true,
                message: "Đăng nhập thành công!",
                user: user,
                redirectUrl: redirectUrl // Trả thêm cái này về cho Frontend
            });

        } catch (error) {
            console.error("Lỗi Login Controller:", error);
            res.status(500).json({ success: false, message: "Lỗi hệ thống." });
        }
    }
    // --- XỬ LÝ ĐĂNG XUẤT ---
    logout(req, res) {
        // Phá hủy phiên làm việc trên server
        req.session.destroy((err) => {
            if (err) {
                console.error("Lỗi khi hủy session:", err);
                return res.redirect('/'); // Nếu lỗi vẫn đẩy về trang chủ cho an toàn
            }
            // Xóa Cookie chứa ID phiên làm việc ở trình duyệt
            res.clearCookie('connect.sid');

            // Sau khi xóa sạch, đẩy người dùng về trang chủ
            res.redirect('/');
        });
    }
    // Cập nhật thông tin (Họ tên, SĐT)
    async updateProfile(req, res) {
        try {
            const { hoTen, soDienThoai } = req.body;
            const maND = req.session.user.MA_NGUOI_DUNG;

            const pool = await poolPromise;
            await pool.request()
                .input('hoTen', sql.NVarChar, hoTen)
                .input('sdt', sql.VarChar, soDienThoai)
                .input('id', sql.Int, maND)
                .query('UPDATE NGUOI_DUNG SET HO_TEN = @hoTen, SO_DIEN_THOAI = @sdt WHERE MA_NGUOI_DUNG = @id');

            // Cập nhật lại session để hiển thị tên mới trên Header
            req.session.user.HO_TEN = hoTen;
            req.session.user.SO_DIEN_THOAI = soDienThoai;

            res.json({ success: true, message: "Cập nhật hồ sơ thành công!" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Lỗi hệ thống" });
        }
    }
    // controllers/AuthController.js
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            const maND = req.session.user.MA_NGUOI_DUNG;

            // 1. Lấy thông tin user hiện tại từ DB
            const user = await taiKhoanModel.findById(maND); // Đảm bảo model có hàm findById

            // 2. Kiểm tra mật khẩu cũ có đúng không
            const isMatch = await bcrypt.compare(oldPassword, user.MAT_KHAU);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Mật khẩu cũ không chính xác!" });
            }

            // 3. Băm mật khẩu mới
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // 4. Cập nhật vào DB (Duy dùng pool trực tiếp hoặc qua Model)
            const pool = await poolPromise;
            await pool.request()
                .input('pass', sql.VarChar, hashedPassword)
                .input('id', sql.Int, maND)
                .query('UPDATE NGUOI_DUNG SET MAT_KHAU = @pass WHERE MA_NGUOI_DUNG = @id');

            res.json({ success: true, message: "Đổi mật khẩu thành công!" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Lỗi hệ thống." });
        }
    }
    // --- XỬ LÝ ĐĂNG KÝ ---
    async register(req, res) {
        try {
            const { username, password, fullname, email, phone } = req.body;

            if (!username || !password || !fullname) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập đủ thông tin bắt buộc!" });
            }

            const existingUser = await taiKhoanModel.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Tên đăng nhập này đã có người sử dụng!" });
            }

            // 3. BĂM MẬT KHẨU TRƯỚC KHI LƯU
            const salt = await bcrypt.genSalt(10); // Tạo chuỗi ngẫu nhiên (độ khó 10)
            const hashedPassword = await bcrypt.hash(password, salt); // Băm mật khẩu chung với salt

            await taiKhoanModel.create({
                username,
                password: hashedPassword, // Lưu mật khẩu đã BĂM vào DB
                fullname,
                email,
                phone,
                vaiTro: 2
            });

            res.status(200).json({ success: true, message: "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ." });
        } catch (error) {
            console.error("Lỗi Đăng ký:", error);
            res.status(500).json({ success: false, message: "Lỗi hệ thống khi đăng ký." });
        }
    }

}
module.exports = new AuthController();