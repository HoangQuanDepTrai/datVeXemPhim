const { poolPromise, sql } = require('../config/db');

class ghe {
    // 1. Hàm lấy THÔNG TIN CHUNG của suất chiếu
    async getThongTinSuatChieu(maSuatChieu) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('maSC', sql.Int, maSuatChieu)
                .query(`
                SELECT 
                    sc.MA_SUAT_CHIEU,
                    sc.GIA_VE_CO_BAN,
                    FORMAT(sc.GIO_BAT_DAU, 'HH:mm') AS GIO_FORMAT,
                    FORMAT(sc.NGAY_CHIEU, 'dd/MM/yyyy') AS NGAY_FORMAT,
                    p.TEN_PHIM,
                    p.HINH_ANH_POSTER,
                    r.TEN_RAP,
                    pc.TEN_PHONG_CHIEU
                FROM SUAT_CHIEU sc
                JOIN PHIM p ON sc.MA_PHIM = p.MA_PHIM
                JOIN PHONG_CHIEU pc ON sc.MA_PHONG_CHIEU = pc.MA_PHONG_CHIEU
                JOIN THONG_TIN_RAP r ON pc.MA_RAP = r.MA_RAP
                WHERE sc.MA_SUAT_CHIEU = @maSC
            `);
            return result.recordset;
        } catch (error) {
            console.error("Lỗi getThongTinSuatChieu:", error);
            throw error;
        }
    }

    // 2. Hàm lấy DANH SÁCH GHẾ của suất chiếu (Dành cho trang khách hàng đặt vé)
    async getGheBySuatChieu(maSuatChieu) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('maSC', sql.Int, maSuatChieu)
                .query(`
                SELECT 
                    g.MA_GHE_NGOI, 
                    g.TEN_GHE_NGOI, 
                    g.TRANG_THAI_GHE, /* ĐÃ THÊM CỘT NÀY ĐỂ CHECK GHẾ HỎNG */
                    g.GIA_GHE_NGOI, 
                    sc.GIA_VE_CO_BAN,            
                    CASE WHEN v.MA_VE_XEM_PHIM IS NOT NULL THEN 1 ELSE 0 END AS DA_DAT
                FROM GHE_NGOI g
                JOIN SUAT_CHIEU sc ON g.MA_PHONG_CHIEU = sc.MA_PHONG_CHIEU
                LEFT JOIN VE_XEM_PHIM v ON g.MA_GHE_NGOI = v.MA_GHE_NGOI 
                                        AND v.MA_SUAT_CHIEU = sc.MA_SUAT_CHIEU
                WHERE sc.MA_SUAT_CHIEU = @maSC
                /* Sửa lại order by để xếp A1, A2... thay vì A1, A10, A2 */
                ORDER BY LEFT(g.TEN_GHE_NGOI, 1), CAST(SUBSTRING(g.TEN_GHE_NGOI, 2, LEN(g.TEN_GHE_NGOI)) AS INT)
            `);
            return result.recordset;
        } catch (error) {
            console.error("Lỗi getGheBySuatChieu:", error);
            throw error;
        }
    }

    // 3. Hàm tạo 1 ghế (Ít dùng nếu đã có insert hàng loạt)
    async insertGhe({ maPhong, tenGhe, gia }) {
        try {
            const pool = await poolPromise;
            const loaiGhe = (gia > 0) ? 'VIP' : 'Thường';

            await pool.request()
                .input('MaPhong', sql.Int, maPhong)
                .input('TenGhe', sql.VarChar, tenGhe)
                .input('TrangThaiGhe', sql.NVarChar, loaiGhe)
                .input('GiaGhe', sql.Decimal(18, 2), gia)
                .input('TinhTrangDat', sql.Int, 0)
                .query(`
                    INSERT INTO GHE_NGOI (MA_PHONG_CHIEU, TEN_GHE_NGOI, TRANG_THAI_GHE, GIA_GHE_NGOI, TINH_TRANG_DAT_GHE) 
                    VALUES (@MaPhong, @TenGhe, @TrangThaiGhe, @GiaGhe, @TinhTrangDat)
                `);
            return true;
        } catch (error) {
            console.error("Lỗi insertGhe trong Model:", error.message);
            throw error;
        }
    }

    // 4. Lấy sơ đồ ghế để Admin xem/chỉnh sửa
    async getGheByPhong(maPhong) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('MaPhong', sql.Int, maPhong)
                .query(`
                    SELECT MA_GHE_NGOI, TEN_GHE_NGOI, TRANG_THAI_GHE 
                    FROM GHE_NGOI 
                    WHERE MA_PHONG_CHIEU = @MaPhong
                    ORDER BY LEFT(TEN_GHE_NGOI, 1), CAST(SUBSTRING(TEN_GHE_NGOI, 2, LEN(TEN_GHE_NGOI)) AS INT)
                `);
            return result.recordset;
        } catch (error) {
            console.error("Lỗi lấy sơ đồ ghế:", error.message);
            throw error;
        }
    }

    // 5. Cập nhật trạng thái ghế (Báo hỏng/Sửa ghế)
    async updateStatus(seats) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            for (let seat of seats) {
                await transaction.request()
                    .input('maGhe', sql.Int, seat.maGhe)
                    .input('trangThai', sql.NVarChar, seat.trangThaiMoi)
                    .query('UPDATE GHE_NGOI SET TRANG_THAI_GHE = @trangThai WHERE MA_GHE_NGOI = @maGhe');
            }
            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async recreateCustomSeats(maPhong, danhSachGhe) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // BƯỚC 1: Xóa các vé đã đặt có liên quan đến các ghế của phòng này
            // (Vì ghế sắp bị xóa sạch để tạo mới nên vé cũ không còn ý nghĩa)
            await transaction.request()
                .input('maPhong', sql.Int, maPhong)
                .query(`
                    DELETE FROM VE_XEM_PHIM 
                    WHERE MA_GHE_NGOI IN (SELECT MA_GHE_NGOI FROM GHE_NGOI WHERE MA_PHONG_CHIEU = @maPhong)
                `);

            // BƯỚC 2: Bây giờ mới an tâm xóa toàn bộ ghế cũ của phòng
            await transaction.request()
                .input('maPhong', sql.Int, maPhong)
                .query('DELETE FROM GHE_NGOI WHERE MA_PHONG_CHIEU = @maPhong');

            // BƯỚC 3: Thêm danh sách ghế mới từ Frontend gửi lên
            for (let ghe of danhSachGhe) {
                await transaction.request()
                    .input('maPhong', sql.Int, maPhong)
                    .input('tenGhe', sql.NVarChar, ghe.tenGhe)
                    .input('giaGhe', sql.Decimal(18, 2), ghe.giaGhe)
                    // LẤY LOẠI GHẾ (VIP/Thường) TỪ FRONTEND GỬI LÊN
                    .input('loaiGhe', sql.NVarChar, ghe.loaiGhe)
                    .query(`
            INSERT INTO GHE_NGOI (MA_PHONG_CHIEU, TEN_GHE_NGOI, GIA_GHE_NGOI, TRANG_THAI_GHE, TINH_TRANG_DAT_GHE)
            VALUES (@maPhong, @tenGhe, @giaGhe, @loaiGhe, 0)
        `);
            }

            await transaction.commit();
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            console.error("LỖI SQL KHI RECREATE GHẾ:", err.message);
            throw err;
        }
    }
}

module.exports = new ghe();