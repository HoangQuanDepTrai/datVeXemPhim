const gheModel = require('../models/ghe');

class GheController {
    getSodoGhe = async (req, res) => {
        try {
            const { maSuatChieu } = req.params;
            const data = await gheModel.getBySuatChieu(maSuatChieu);
            res.json({ success: true, data });
        } catch (error) {
            console.error("Lỗi GheController:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
module.exports = new GheController();