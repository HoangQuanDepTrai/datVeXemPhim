const veModel = require('../models/vexemphim');
const vnpayService = require('../services/vnpayService');

const pendingOrders = new Map();

class VeController {
    // 1. HÀM ĐẶT VÉ (GỌI KHI KHÁCH BẤM NÚT "THANH TOÁN")
    datVe = async (req, res) => {
        try {
            console.log("\n--- [START] KHỞI TẠO ĐƠN HÀNG MỚI ---");
            const { maNguoiDung, maSuatChieu, danhSachMaGhe, tongTien } = req.body;

            // Log dữ liệu đầu vào để kiểm tra
            console.log(`> Khách hàng ID: ${maNguoiDung}`);
            console.log(`> Suất chiếu ID: ${maSuatChieu}`);
            console.log(`> Danh sách ghế: ${danhSachMaGhe.join(', ')}`);
            console.log(`> Số tiền: ${tongTien} VND`);

            // Tạo mã đơn hàng tạm thời (OrderId) bằng timestamp để duy nhất
            const orderId = Date.now().toString();

            // LƯU THÔNG TIN VÀO RAM (Tuyệt đối không lưu SQL ở bước này)
            pendingOrders.set(orderId, {
                maNguoiDung,
                maSuatChieu,
                danhSachMaGhe,
                tongTien
            });

            console.log(`> Đã đưa đơn hàng ${orderId} vào RAM. Chờ khách thanh toán qua VNPay...`);

            // Tạo link thanh toán VNPay gửi khách đi
            const paymentUrl = vnpayService.createPaymentUrl(req, tongTien, orderId);

            console.log(`> Đã tạo link thanh toán thành công.`);
            res.json({ success: true, paymentUrl });

        } catch (error) {
            console.error("LỖI TẠI HÀM DATVE:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // 2. HÀM VNPAY RETURN (GỌI KHI VNPAY QUAY TRỞ LẠI WEB
    vnpayReturn = async (req, res) => {
        try {
            console.log("\n" + "=".repeat(50));
            console.log("HIT] Đã chạm được vào hàm vnpayReturn!");

            let vnp_Params = req.query;
            let secureHash = vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            vnp_Params = this.sortObject(vnp_Params);
            const secretKey = process.env.VNP_HASHSECRET;
            const signData = require('qs').stringify(vnp_Params, { encode: false });
            const hmac = require('crypto').createHmac("sha512", secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            const orderId = vnp_Params['vnp_TxnRef'];
            const responseCode = vnp_Params['vnp_ResponseCode'];

            if (secureHash === signed && responseCode === "00") {
                const orderData = pendingOrders.get(orderId);

                if (!orderData) {
                    console.error("LỖI: RAM trống (orderId: " + orderId + "). Đừng bấm Ctrl+S khi đang test!");
                    return res.render('ketquathanhtoan', { success: false, message: "Hết hạn phiên giao dịch." });
                }
                // --- IN RA DỮ LIỆU CHUẨN BỊ LƯU DB ---
                console.log("\n[DỮ LIỆU CHUẨN BỊ LƯU SQL SERVER]");
                console.log("------------------------------------");
                console.log(`- User ID:     ${orderData.maNguoiDung}`);
                console.log(`- Suất chiếu:  ${orderData.maSuatChieu}`);
                console.log(`- Ghế chọn:    ${orderData.danhSachMaGhe.join(', ')}`);
                console.log(`- Tổng tiền:   ${orderData.tongTien.toLocaleString()} đ`);
                console.log(`- Mã VNPay:    ${vnp_Params['vnp_TransactionNo']}`);
                console.log("------------------------------------\n");

                console.log("Đang chạy các câu lệnh INSERT...");
                // 1. Tạo Hóa đơn
                const maHD = await veModel.createHoaDon(orderData.maNguoiDung, orderData.maSuatChieu, orderData.tongTien);
                console.log(`[OK] Đã tạo Hóa đơn ID: ${maHD}`);

                // 2. Cập nhật trạng thái
                await veModel.updateStatus(maHD, 'Đã thanh toán', vnp_Params['vnp_TransactionNo']);
                console.log(`[OK] Đã chốt trạng thái 'Đã thanh toán' cho HD ${maHD}`);

                // 3. Tạo vé cho từng ghế
                for (let maGhe of orderData.danhSachMaGhe) {
                    await veModel.createVe(maHD, maGhe, orderData.maSuatChieu);
                    console.log(`Đã tạo vé cho ghế: ${maGhe}`);
                }

                pendingOrders.delete(orderId);
                console.log("\nDATABASE ĐÃ CẬP NHẬT ĐẦY ĐỦ.");
                console.log("=".repeat(50));

                const thongTinVe = await veModel.getChiTietVeSauThanhToan(maHD);
                res.render('ketquathanhtoan', { success: true, data: thongTinVe });

            } else {
                console.log("Giao dịch thất bại hoặc sai chữ ký.");
                res.render('ketquathanhtoan', { success: false, message: "Thanh toán không thành công." });
            }
        } catch (error) {
            console.error("LỖI HỆ THỐNG:", error);
            res.status(500).send("Lỗi xử lý thanh toán.");
        }
    }
    // HÀM HỖ TRỢ: SẮP XẾP VÀ ENCODE THAM SỐ VNPAY (BẮT BUỘC)
    sortObject(obj) {
        let sorted = {};
        let str = [];
        let key;
        for (key in obj) {
            // Thay đổi dòng dưới đây để dùng cách gọi an toàn hơn
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
        }
        return sorted;
    }
    // HÀM: XEM LỊCH SỬ ĐẶT VÉ CỦA NGƯỜI DÙNG
    lichSuDatVe = async (req, res) => {
        try {
            const maND = req.query.maND;

            // NẾU KHÔNG CÓ MÃ ND: Render trang không có dữ liệu để Client-side tự redirect
            if (!maND) {
                return res.render('lich-su-dat-ve', { lichSu: null });
            }

            // NẾU CÓ MÃ ND: Lấy dữ liệu từ DB
            const lichSu = await veModel.getLichSuDatVe(maND);
            res.render('lich-su-dat-ve', { lichSu });

        } catch (error) {
            console.error("Lỗi lấy lịch sử:", error);
            res.status(500).send("Lỗi máy chủ khi lấy lịch sử đặt vé.");
        }
    }
}
module.exports = new VeController();