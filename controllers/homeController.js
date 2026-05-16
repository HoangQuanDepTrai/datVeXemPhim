const phimModel = require('../models/phim');
const danhGiaModel = require('../models/danhgia');
const rapModel = require('../models/rap');

class HomeController {
    // 1. TRANG CHỦ (Hiển thị phim và 3 review mới nhất)
    async getHomePage(req, res) {
        try {
            // Lấy dữ liệu song song để web load nhanh hơn
            const [movies, recentReviews] = await Promise.all([
                phimModel.getAll(),
                danhGiaModel.getRecentReviews(3) // Lấy 3 đánh giá mới nhất cho trang chủ
            ]);

            // Cắt lấy 10 phim đầu tiên để đưa lên mục "Phim Đang Chiếu"
            const heroMovies = movies.slice(0, 10);

            res.render('index', {
                heroMovies: heroMovies,
                recentReviews: recentReviews
            });
        } catch (error) {
            console.error("Lỗi tải trang chủ:", error);
            res.status(500).send("Lỗi server khi tải trang chủ.");
        }
    }

    // 2. TRANG HỆ THỐNG RẠP (Hiển thị toàn bộ rạp chiếu)
    async getRapChieuPage(req, res) {
        try {
            const raps = await rapModel.getAll();
            res.render('rapchieu', { raps: raps });
        } catch (error) {
            console.error("Lỗi tải trang rạp chiếu:", error);
            res.status(500).send("Lỗi máy chủ khi tải danh sách rạp.");
        }
    }

    // 3. TRANG REVIEW PHIM (Hiển thị nhiều đánh giá hơn)
    async getReviewPage(req, res) {
        try {
            const reviews = await danhGiaModel.getRecentReviews(20);
            let phimDaXem = [];

            // Lấy thông tin user đăng nhập (Tùy thuộc bạn lưu user vào session hay locals)
            // Giả sử bạn đang dùng req.session.user
            const user = req.session ? req.session.user : res.locals.user;

            if (user && user.MA_NGUOI_DUNG) {
                // Nếu đã đăng nhập, truy vấn các phim người này đã mua vé
                phimDaXem = await phimModel.getPhimDaXem(user.MA_NGUOI_DUNG);
            }

            res.render('review', {
                reviews: reviews,
                phimDaXem: phimDaXem,
                user: user // Truyền user sang để EJS biết trạng thái đăng nhập
            });
        } catch (error) {
            console.error("Lỗi tải trang review:", error);
            res.status(500).send("Lỗi máy chủ khi tải trang đánh giá.");
        }
    }

    // 2. THÊM HÀM NÀY: Xử lý khi khách bấm gửi form đánh giá
    // Trong controllers/homeController.js
    async submitReviewAPI(req, res) {
        try {
            // 1. LẤY USER TỪ SESSION (Bảo mật 100%)
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để đánh giá!" });
            }

            // 2. Lấy dữ liệu từ Frontend gửi lên
            const { maPhim, rating, noiDung } = req.body;

            // 3. RÀNG BUỘC (Tùy chọn ăn điểm 10): Kiểm tra xem user đã mua vé phim này chưa?
            /* const phimDaXem = await phimModel.getPhimDaXem(user.MA_NGUOI_DUNG);
            const daMuaVe = phimDaXem.some(p => p.MA_PHIM == maPhim);
            if (!daMuaVe) {
                return res.status(403).json({ success: false, message: "Bạn phải mua vé và xem phim này mới được đánh giá!" });
            }
            */

            // 4. Lưu vào Database (Nhớ update hàm create trong Model để nhận thêm biến rating nhé)
            await danhGiaModel.create(maPhim, user.MA_NGUOI_DUNG, rating, noiDung);

            // Trả về JSON để Frontend xử lý mượt mà
            res.json({ success: true, message: "Cảm ơn bạn đã gửi đánh giá!" });

        } catch (error) {
            console.error("Lỗi lưu đánh giá:", error);
            res.status(500).json({ success: false, message: "Lỗi hệ thống khi gửi đánh giá." });
        }
    }
}

module.exports = new HomeController();