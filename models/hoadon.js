const { poolPromise, sql } = require('../config/db');

class HoadonModel {
    /**
     * Tạo hóa đơn mới và return MA_HOA_DON
     * Dùng cho veController.datVe bước INSERT HOA_DON
     */
    async create(maNguoiDung, tongTien) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maND', sql.Int, maNguoiDung)
            .input('ngay', sql.DateTime, new Date())
            .input('tong', sql.Decimal(18, 2), tongTien)
            .query(`
                INSERT INTO HOA_DON (MA_NGUOI_DUNG, NGAY_DAT, TONG_TIEN) 
                OUTPUT INSERTED.MA_HOA_DON 
                VALUES (@maND, @ngay, @tong)
            `);
        return result.recordset[0].MA_HOA_DON;
    }
    // Lấy danh sách toàn bộ hóa đơn cho trang Admin
    async getAllAdmin() {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT H.MA_HOA_DON, H.NGAY_DAT_VE, H.TONG_TIEN_THANH_TOAN, H.TRANG_THAI_THANH_TOAN,
                   N.HO_TEN, N.SO_DIEN_THOAI,
                   P.TEN_PHIM
            FROM HOA_DON H
            JOIN NGUOI_DUNG N ON H.MA_NGUOI_DUNG = N.MA_NGUOI_DUNG
            JOIN SUAT_CHIEU S ON H.MA_SUAT_CHIEU = S.MA_SUAT_CHIEU
            JOIN PHIM P ON S.MA_PHIM = P.MA_PHIM
            ORDER BY H.NGAY_DAT_VE DESC
        `);
        return result.recordset;
    }

    // LẤY HÓA ĐƠN THUẦN TÚY KHÔNG JOIN
    async getLichSuByMaND(maND) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('MaND', sql.Int, maND)
                .query(`
                    SELECT 
                        MA_HOA_DON,
                        MA_NGUOI_DUNG,
                        MA_SUAT_CHIEU,
                        NGAY_DAT_VE,
                        GIO_DAT_VE,
                        TONG_TIEN_THANH_TOAN,
                        TRANG_THAI_THANH_TOAN,
                        MA_GIAO_DICH_VNPAY
                    FROM HOA_DON
                    WHERE MA_NGUOI_DUNG = @MaND
                    ORDER BY NGAY_DAT_VE DESC, GIO_DAT_VE DESC
                `);
            return result.recordset;
        } catch (error) {
            console.error("Lỗi truy vấn SQL lịch sử hóa đơn:", error.message);
            throw error;
        }
    }

    async getDanhSachVeDeIn(maHD) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('maHD', sql.Int, maHD)
                .query(`
                SELECT 
                    HD.MA_HOA_DON,
                    P.TEN_PHIM,
                    CONVERT(VARCHAR(5), SC.GIO_BAT_DAU, 108) AS GIO_CHIEU,
                    CONVERT(VARCHAR(10), SC.NGAY_CHIEU, 103) AS NGAY_CHIEU,
                    PC.TEN_PHONG_CHIEU,
                    G.TEN_GHE_NGOI, -- Lấy đích danh tên từng ghế
                    HD.TONG_TIEN_THANH_TOAN,
                    HD.MA_GIAO_DICH_VNPAY
                FROM VE_XEM_PHIM V
                JOIN HOA_DON HD ON V.MA_HOA_DON = HD.MA_HOA_DON
                JOIN GHE_NGOI G ON V.MA_GHE_NGOI = G.MA_GHE_NGOI
                JOIN SUAT_CHIEU SC ON V.MA_SUAT_CHIEU = SC.MA_SUAT_CHIEU
                JOIN PHIM P ON SC.MA_PHIM = P.MA_PHIM
                JOIN PHONG_CHIEU PC ON SC.MA_PHONG_CHIEU = PC.MA_PHONG_CHIEU
                WHERE HD.MA_HOA_DON = @maHD
            `);
            return result.recordset; // Trả về danh sách tất cả các vé
        } catch (error) {
            console.error("Lỗi lấy danh sách vé:", error.message);
            throw error;
        }
    }
    async getChiTietHoaDonById(maHD) {
        try {
            const pool = await poolPromise;
            const query = `
                SELECT TOP 1
                    HD.MA_HOA_DON,
                    HD.TONG_TIEN_THANH_TOAN,
                    P.TEN_PHIM,
                    P.HINH_ANH_POSTER,
                    CONVERT(VARCHAR(5), SC.GIO_BAT_DAU, 108) AS GIO_CHIEU,
                    CONVERT(VARCHAR(10), SC.NGAY_CHIEU, 103) AS NGAY_CHIEU,
                    PC.TEN_PHONG_CHIEU,
                    
                    -- 1. Gom danh sách ghế
                    STUFF((
                        SELECT ', ' + G.TEN_GHE_NGOI 
                        FROM VE_XEM_PHIM V2 
                        JOIN GHE_NGOI G ON V2.MA_GHE_NGOI = G.MA_GHE_NGOI 
                        WHERE V2.MA_HOA_DON = HD.MA_HOA_DON
                        FOR XML PATH('')
                    ), 1, 2, '') AS DANH_SACH_GHE,
                    -- 2. Gom danh sách bắp nước (Hiện rõ: Tên (x SL): Giá đ = Tổng đ)
                    STUFF((
                            SELECT ' <br> • <b>' + SP.TEN_SAN_PHAM + '</b> (x' + CAST(CT.SO_LUONG AS VARCHAR) + ') ' +
                                '<span class="text-warning">' + FORMAT(CT.GIA_BAN * CT.SO_LUONG, 'N0') + 'đ</span>'
                            FROM CHI_TIET_HOA_DON CT
                            JOIN SAN_PHAM SP ON CT.MA_SAN_PHAM = SP.MA_SAN_PHAM
                            WHERE CT.MA_HOA_DON = HD.MA_HOA_DON
                            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)')
                        , 1, 6, '') AS DANH_SACH_SP

                FROM HOA_DON HD
                JOIN VE_XEM_PHIM V ON HD.MA_HOA_DON = V.MA_HOA_DON
                JOIN SUAT_CHIEU SC ON V.MA_SUAT_CHIEU = SC.MA_SUAT_CHIEU
                JOIN PHIM P ON SC.MA_PHIM = P.MA_PHIM
                JOIN PHONG_CHIEU PC ON SC.MA_PHONG_CHIEU = PC.MA_PHONG_CHIEU
                WHERE HD.MA_HOA_DON = @maHD
            `;

            const result = await pool.request()
                .input('maHD', sql.Int, maHD)
                .query(query);
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            console.error("Lỗi Model getChiTietHoaDonById:", error.message);
            throw error;
        }
    }
}

module.exports = new HoadonModel();

