const { poolPromise, sql } = require('../config/db');

class SanPhamModel {
    // Lấy danh sách sản phẩm bắp nước đang kinh doanh
    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM SAN_PHAM");
        return result.recordset;
    }
    async addChiTiet(maHD, maSP, soLuong) {
        const pool = await poolPromise;
        await pool.request()
            .input('maHD', sql.Int, maHD)
            .input('maSP', sql.Int, maSP)
            .input('sl', sql.Int, soLuong)
            .query(`
                INSERT INTO CHI_TIET_HOA_DON (MA_HOA_DON, MA_SAN_PHAM, SO_LUONG)
                VALUES (@maHD, @maSP, @sl)
            `);
    }
}
module.exports = new SanPhamModel();