const { poolPromise, sql } = require('../config/db');

class VeModel {
    // 1. Tạo hóa đơn mới (Chỉ gọi khi nhận tiền thành công)
    async createHoaDon(maND, maSC, tongTien) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maND', sql.Int, maND)
            .input('maSC', sql.Int, maSC)
            .input('ngay', sql.DateTime, new Date())
            .input('tong', sql.Decimal(18, 2), tongTien)
            .input('trangthai', sql.NVarChar, 'Đã thanh toán')
            .query(`
                INSERT INTO HOA_DON (MA_NGUOI_DUNG, MA_SUAT_CHIEU, NGAY_DAT_VE, TONG_TIEN_THANH_TOAN, TRANG_THAI_THANH_TOAN) 
                OUTPUT INSERTED.MA_HOA_DON 
                VALUES (@maND, @maSC, @ngay, @tong, @trangthai)
            `);
        return result.recordset[0].MA_HOA_DON;
    }

    // 2. Cập nhật trạng thái và mã giao dịch VNPay (Quan trọng!)
    async updateStatus(maHD, trangThai, maGiaoDichVNP) {
        const pool = await poolPromise;
        return await pool.request()
            .input('trangThai', sql.NVarChar, trangThai)
            .input('maVNP', sql.VarChar, maGiaoDichVNP)
            .input('maHD', sql.Int, maHD)
            .query(`
                UPDATE HOA_DON 
                SET TRANG_THAI_THANH_TOAN = @trangThai, 
                    MA_GIAO_DICH_VNPAY = @maVNP 
                WHERE MA_HOA_DON = @maHD
            `);
    }

    // 3. Lưu từng chiếc vé (ghế ngồi)
    async createVe(maHD, maGhe, maSC) {
        const pool = await poolPromise;
        return await pool.request()
            .input('maHD', sql.Int, maHD)
            .input('maGhe', sql.Int, maGhe)
            .input('maSC', sql.Int, maSC)
            .query(`
                INSERT INTO VE_XEM_PHIM (MA_HOA_DON, MA_GHE_NGOI, MA_SUAT_CHIEU) 
                VALUES (@maHD, @maGhe, @maSC)
            `);
    }

    async getChiTietVeSauThanhToan(maHD) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maHD', sql.Int, maHD)
            .query(`
                SELECT H.MA_HOA_DON, H.TONG_TIEN_THANH_TOAN as TONG_TIEN, P.TEN_PHIM, S.GIO_BAT_DAU as GIO_CHIEU,
                S.NGAY_CHIEU, STRING_AGG(G.TEN_GHE_NGOI, ', ') as DANH_SACH_GHE
                FROM HOA_DON H
                JOIN SUAT_CHIEU S ON H.MA_SUAT_CHIEU = S.MA_SUAT_CHIEU
                JOIN PHIM P ON S.MA_PHIM = P.MA_PHIM
                JOIN VE_XEM_PHIM V ON H.MA_HOA_DON = V.MA_HOA_DON
                JOIN GHE_NGOI G ON V.MA_GHE_NGOI = G.MA_GHE_NGOI
                WHERE H.MA_HOA_DON = @maHD
                GROUP BY H.MA_HOA_DON, H.TONG_TIEN_THANH_TOAN, P.TEN_PHIM, S.GIO_BAT_DAU, S.NGAY_CHIEU
            `);
        return result.recordset;
    }
    // Thêm vào file models/vexemphim.js
    // 5. Lấy toàn bộ lịch sử đặt vé của 1 khách hàng
    async getLichSuDatVe(maND) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maND', sql.Int, maND)
            .query(`
                SELECT H.MA_HOA_DON, H.NGAY_DAT_VE, H.TONG_TIEN_THANH_TOAN, H.TRANG_THAI_THANH_TOAN,
                       P.TEN_PHIM, P.HINH_ANH_POSTER,
                       LEFT(CAST(S.GIO_BAT_DAU AS TIME), 5) AS GIO_CHIEU, 
                       CONVERT(VARCHAR, S.NGAY_CHIEU, 103) AS NGAY_CHIEU_FORMAT,
                       R.TEN_RAP, PC.TEN_PHONG_CHIEU,
                       STRING_AGG(G.TEN_GHE_NGOI, ', ') WITHIN GROUP (ORDER BY G.TEN_GHE_NGOI) AS DANH_SACH_GHE
                FROM HOA_DON H
                JOIN SUAT_CHIEU S ON H.MA_SUAT_CHIEU = S.MA_SUAT_CHIEU
                JOIN PHIM P ON S.MA_PHIM = P.MA_PHIM
                JOIN PHONG_CHIEU PC ON S.MA_PHONG_CHIEU = PC.MA_PHONG_CHIEU
                JOIN THONG_TIN_RAP R ON PC.MA_RAP = R.MA_RAP
                LEFT JOIN VE_XEM_PHIM V ON H.MA_HOA_DON = V.MA_HOA_DON
                LEFT JOIN GHE_NGOI G ON V.MA_GHE_NGOI = G.MA_GHE_NGOI
                WHERE H.MA_NGUOI_DUNG = @maND
                GROUP BY H.MA_HOA_DON, H.NGAY_DAT_VE, H.TONG_TIEN_THANH_TOAN, H.TRANG_THAI_THANH_TOAN,
                         P.TEN_PHIM, P.HINH_ANH_POSTER, S.GIO_BAT_DAU, S.NGAY_CHIEU, R.TEN_RAP, PC.TEN_PHONG_CHIEU
                ORDER BY H.NGAY_DAT_VE DESC
            `);
        return result.recordset;
    }
}
module.exports = new VeModel();