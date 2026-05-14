const { poolPromise, sql } = require('../config/db');

class PhimModel {
    async getAll() {
        const pool = await poolPromise;
        // Thêm subquery để lấy ra NGAY_KHOI_CHIEU (Ngày chiếu sớm nhất của phim đó)
        const result = await pool.request().query(`
            SELECT 
                p.*, 
                tl.TEN_THE_LOAI,
                (SELECT MIN(NGAY_CHIEU) FROM SUAT_CHIEU sc WHERE sc.MA_PHIM = p.MA_PHIM) AS NGAY_KHOI_CHIEU
            FROM PHIM p
            LEFT JOIN THE_LOAI tl ON p.MA_THE_LOAI = tl.MA_THE_LOAI
        `);
        return result.recordset;
    }
    async getPhimHienThi() {
        const pool = await poolPromise;
        const result = await pool.request().query(`
        SELECT 
            p.*, 
            tl.TEN_THE_LOAI,
            (SELECT MIN(NGAY_CHIEU) FROM SUAT_CHIEU sc WHERE sc.MA_PHIM = p.MA_PHIM) AS NGAY_KHOI_CHIEU
        FROM PHIM p
        LEFT JOIN THE_LOAI tl ON p.MA_THE_LOAI = tl.MA_THE_LOAI
        WHERE p.TRANG_THAI = 1 -- CHỈ LẤY PHIM ĐANG HIỆN
    `);
        return result.recordset;
    }
    // Lấy chi tiết 1 bộ phim
    async getById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT p.*, tl.TEN_THE_LOAI 
                FROM PHIM p 
                LEFT JOIN THE_LOAI tl ON p.MA_THE_LOAI = tl.MA_THE_LOAI 
                WHERE p.MA_PHIM = @id
            `);
        return result.recordset[0];
    }

    // Lấy danh sách thể loại để hiển thị trong Form Thêm/Sửa
    async getAllTheLoai() {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM THE_LOAI");
        return result.recordset;
    }

    // Thêm phim mới
    async create(data) {
        const pool = await poolPromise;
        return await pool.request()
            .input('ten', sql.NVarChar, data.ten)
            .input('trailer', sql.VarChar, data.trailer)
            .input('noidung', sql.NVarChar, data.noidung)
            .input('tuoi', sql.Int, data.tuoi)
            .input('thoiluong', sql.Int, data.thoiluong)
            .input('daodien', sql.NVarChar, data.daodien)
            .input('dienvien', sql.NVarChar, data.dienvien)
            .input('poster', sql.VarChar, data.poster)
            .input('nen', sql.VarChar, data.nen)
            .input('maTL', sql.Int, data.maTL)
            .query(`
            INSERT INTO PHIM (TEN_PHIM, DUONG_DAN_TRAILER, NOI_DUNG_PHIM, GIOI_HAN_TUOI, THOI_LUONG_PHIM, DAO_DIEN, DIEN_VIEN, HINH_ANH_POSTER, HINH_ANH_NEN, MA_THE_LOAI) 
            VALUES (@ten, @trailer, @noidung, @tuoi, @thoiluong, @daodien, @dienvien, @poster, @nen, @maTL)
        `);
    }

    // Cập nhật phim
    async update(id, data) {
        const pool = await poolPromise;
        return await pool.request()
            .input('id', sql.Int, id)
            .input('ten', sql.NVarChar, data.ten)
            .input('mota', sql.NVarChar, data.mota)
            .input('thoiluong', sql.Int, data.thoiluong)
            .input('anh', sql.VarChar, data.anh)
            .input('ngay', sql.Date, data.ngay)
            .input('maTL', sql.Int, data.maTL)
            .query(`
                UPDATE PHIM 
                SET TEN_PHIM = @ten, MO_TA = @mota, THOI_LUONG = @thoiluong, 
                    ANH_BIA = @anh, NGAY_KHOI_CHIEU = @ngay, MA_THE_LOAI = @maTL
                WHERE MA_PHIM = @id
            `);
    }
    // Lấy các phim mà User đã mua vé thành công
    async getPhimDaXem(maND) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maND', sql.Int, maND)
            .query(`
                SELECT DISTINCT p.MA_PHIM, p.TEN_PHIM
                FROM HOA_DON hd
                JOIN SUAT_CHIEU sc ON hd.MA_SUAT_CHIEU = sc.MA_SUAT_CHIEU
                JOIN PHIM p ON sc.MA_PHIM = p.MA_PHIM
                WHERE hd.MA_NGUOI_DUNG = @maND 
                AND hd.TRANG_THAI_THANH_TOAN IN (N'Thành công', N'Đã thanh toán')
            `);
        return result.recordset;
    }
    // Hàm này xử lý cả ẩn (status=0) và hiện (status=1)
    async updateStatus(id, status) {
        const pool = await poolPromise;
        return await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.Int, status)
            .query("UPDATE PHIM SET TRANG_THAI = @status WHERE MA_PHIM = @id");
    }
}

module.exports = new PhimModel();