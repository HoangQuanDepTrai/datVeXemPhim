const { poolPromise, sql } = require('../config/db');

class RapModel {
    // 1. Lấy tất cả rạp đang hoạt động (TRANG_THAI = 1)
    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT * FROM THONG_TIN_RAP ORDER BY MA_RAP DESC");
        return result.recordset;
    }

    // 2. Lấy các phòng chiếu thuộc một rạp cụ thể
    async getPhongsByRap(maRap) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maRap', sql.Int, maRap)
            .query("SELECT * FROM PHONG_CHIEU WHERE MA_RAP = @maRap AND TRANG_THAI = 1");
        return result.recordset;
    }

    // 3. Thêm rạp mới
    async create(data) {
        const pool = await poolPromise;
        return await pool.request()
            .input('ten', sql.NVarChar, data.tenRap)
            .input('dc', sql.NVarChar, data.diaChi)
            .input('sdt', sql.VarChar, data.sdt)
            .input('email', sql.VarChar, data.email)
            .query(`INSERT INTO THONG_TIN_RAP (TEN_RAP, DIA_CHI, SO_DIEN_THOAI, EMAIL, TRANG_THAI) 
                    VALUES (@ten, @dc, @sdt, @email, 1)`);
    }

    // 4. Ẩn/Hiện rạp (Đổi trạng thái)
    async toggleStatus(id) {
        const pool = await poolPromise;
        // Lệnh này cực hay: 1 - 1 = 0 (Ẩn), 1 - 0 = 1 (Hiện). Đảo trạng thái tự động.
        return await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE THONG_TIN_RAP SET TRANG_THAI = 1 - TRANG_THAI WHERE MA_RAP = @id");
    }
}

module.exports = new RapModel();