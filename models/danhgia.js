const { poolPromise, sql } = require('../config/db');

class DanhGiaModel {
    // 1. Sửa hàm create để nhận đủ 4 tham số và lưu vào đúng cột DIEM
    async create(maPhim, maND, rating, noiDung) {
        const pool = await poolPromise;
        await pool.request()
            .input('pId', sql.Int, maPhim)
            .input('uId', sql.Int, maND)
            .input('score', sql.Int, rating) // Thêm input cho điểm số (Rating)
            .input('content', sql.NVarChar(sql.MAX), noiDung) // Đây mới là nội dung thật
            .query(`
                INSERT INTO DANH_GIA (MA_PHIM, MA_NGUOI_DUNG, DIEM, NOI_DUNG_DANH_GIA, NGAY_DANH_GIA)
                VALUES (@pId, @uId, @score, @content, GETDATE())
            `);
    }

    // 2. Lấy tất cả bình luận của một bộ phim
    async getByPhim(maPhim) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('pId', sql.Int, maPhim)
            .query(`
                SELECT dg.*, nd.HO_TEN 
                FROM DANH_GIA dg
                JOIN NGUOI_DUNG nd ON dg.MA_NGUOI_DUNG = nd.MA_NGUOI_DUNG
                WHERE dg.MA_PHIM = @pId
                ORDER BY dg.NGAY_DANH_GIA DESC
            `);
        return result.recordset;
    }

    // 3. Lấy đánh giá mới nhất để hiện ra trang "Góc Review"
    async getRecentReviews(limit = 6) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit) 
                    dg.*, 
                    nd.HO_TEN, 
                    p.TEN_PHIM 
                FROM DANH_GIA dg
                JOIN NGUOI_DUNG nd ON dg.MA_NGUOI_DUNG = nd.MA_NGUOI_DUNG
                JOIN PHIM p ON dg.MA_PHIM = p.MA_PHIM
                ORDER BY dg.NGAY_DANH_GIA DESC
            `);
        return result.recordset;
    }
}

module.exports = new DanhGiaModel();