const { poolPromise, sql } = require('../config/db');

class TaiKhoanModel {
    async findByUsername(username) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user', sql.VarChar, username)
            .query(`
                SELECT n.*, v.TEN_VAI_TRO 
                FROM NGUOI_DUNG n
                JOIN VAI_TRO v ON n.MA_VAI_TRO = v.MA_VAI_TRO
                WHERE n.TEN_DANG_NHAP = @user
            `);
        return result.recordset[0];
    }
    async findById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id) // Truyền MA_NGUOI_DUNG vào đây
            .query(`
            SELECT n.*, v.TEN_VAI_TRO 
            FROM NGUOI_DUNG n
            JOIN VAI_TRO v ON n.MA_VAI_TRO = v.MA_VAI_TRO
            WHERE n.MA_NGUOI_DUNG = @id
        `);
        return result.recordset[0]; // Trả về thông tin người dùng duy nhất
    }
    async create(data) {
        const pool = await poolPromise;
        return await pool.request()
            .input('username', sql.VarChar, data.username)
            .input('password', sql.VarChar, data.password) // Thực tế nên mã hóa
            .input('fullname', sql.NVarChar, data.fullname)
            .input('email', sql.VarChar, data.email)
            .input('phone', sql.VarChar, data.phone)
            .input('vaiTro', sql.Int, data.vaiTro) // Truyền ID của VAI_TRO (vd: 2 = Khách hàng)
            .query(`
                INSERT INTO NGUOI_DUNG (TEN_DANG_NHAP, MAT_KHAU, HO_TEN, EMAIL, SO_DIEN_THOAI, MA_VAI_TRO)
                VALUES (@username, @password, @fullname, @email, @phone, @vaiTro)
            `);
    }
    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                n.*, 
                v.TEN_VAI_TRO AS VAI_TRO,  /* Đổi tên cột cho khớp EJS */
                1 AS TRANG_THAI            /* Giả lập trạng thái hoạt động để không bị lỗi */
            FROM NGUOI_DUNG n 
            JOIN VAI_TRO v ON n.MA_VAI_TRO = v.MA_VAI_TRO
            ORDER BY n.MA_VAI_TRO ASC, n.MA_NGUOI_DUNG DESC
        `);
        return result.recordset;
    }
    async updateStatus(id, newStatus) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.Int, newStatus)
            .query(`UPDATE NGUOI_DUNG SET TRANG_THAI = @status WHERE MA_NGUOI_DUNG = @id`);
    }
}
module.exports = new TaiKhoanModel();