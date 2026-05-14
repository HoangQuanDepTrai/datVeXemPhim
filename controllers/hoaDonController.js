const hoadonModel = require('../models/hoadon');

class HoaDonController {
    async getChiTietHoaDonAPI(req, res) {
        try {
            const maHD = req.params.maHD;
            const chiTiet = await hoadonModel.getChiTietHoaDonById(maHD);
            console.log(chiTiet);
            if (chiTiet) {
                res.json({ success: true, data: chiTiet });
            } else {
                res.json({ success: false, message: "Không tìm thấy dữ liệu" });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new HoaDonController();
