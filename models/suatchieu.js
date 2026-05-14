const { poolPromise, sql } = require('../config/db');
class SuatChieuModel {
    async getByPhim(maPhim) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('maPhim', sql.Int, maPhim)
            .query(`
            SELECT SC.MA_SUAT_CHIEU, 
                   LEFT(CAST(SC.GIO_BAT_DAU AS TIME), 5) AS GIO_FORMAT, 
                   CONVERT(VARCHAR, SC.NGAY_CHIEU, 103) as NGAY_FORMAT,
                   R.TEN_RAP, P.TEN_PHONG_CHIEU
            FROM SUAT_CHIEU SC
            JOIN THONG_TIN_RAP R ON SC.MA_RAP = R.MA_RAP
            JOIN PHONG_CHIEU P ON SC.MA_PHONG_CHIEU = P.MA_PHONG_CHIEU
            WHERE SC.MA_PHIM = @maPhim 
              AND SC.TRANG_THAI = 1 -- <--- CHỈ HIỆN SUẤT CHƯA XÓA CHO KHÁCH XEM
            ORDER BY SC.NGAY_CHIEU, SC.GIO_BAT_DAU
        `);
        return result.recordset;
    }

    async getDetailById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
            SELECT 
                SC.MA_SUAT_CHIEU, 
                SC.GIA_VE_CO_BAN, 
                P.TEN_PHIM, 
                P.HINH_ANH_POSTER, -- <--- THÊM DÒNG NÀY ĐỂ LẤY ẢNH
                R.TEN_RAP, 
                PC.TEN_PHONG_CHIEU,
                LEFT(CAST(SC.GIO_BAT_DAU AS TIME), 5) AS GIO_FORMAT,
                CONVERT(VARCHAR, SC.NGAY_CHIEU, 103) AS NGAY_FORMAT
            FROM SUAT_CHIEU SC
            JOIN PHIM P ON SC.MA_PHIM = P.MA_PHIM
            JOIN THONG_TIN_RAP R ON SC.MA_RAP = R.MA_RAP
            JOIN PHONG_CHIEU PC ON SC.MA_PHONG_CHIEU = PC.MA_PHONG_CHIEU
            WHERE SC.MA_SUAT_CHIEU = @id
        `);
        return result.recordset[0];
    }
    async getAllAdmin() {
        try {
            const pool = await poolPromise;
            const sqlQuery = `
        SELECT 
            SC.MA_SUAT_CHIEU, 
            P.TEN_PHIM, 
            R.TEN_RAP, 
            PC.TEN_PHONG_CHIEU AS TEN_PHONG, 
            SC.NGAY_CHIEU, 
            CONVERT(VARCHAR(5), SC.GIO_BAT_DAU, 108) AS GIO_BAT_DAU, 
            SC.GIA_VE_CO_BAN 
        FROM SUAT_CHIEU SC
        JOIN PHIM P ON SC.MA_PHIM = P.MA_PHIM
        JOIN PHONG_CHIEU PC ON SC.MA_PHONG_CHIEU = PC.MA_PHONG_CHIEU
        JOIN THONG_TIN_RAP R ON SC.MA_RAP = R.MA_RAP 
        WHERE SC.TRANG_THAI = 1 -- <--- THÊM DÒNG NÀY ĐỂ LỌC SUẤT ĐÃ XÓA
        ORDER BY SC.NGAY_CHIEU DESC, SC.GIO_BAT_DAU DESC -- Sắp xếp theo thời gian mới nhất
    `;
            const result = await pool.request().query(sqlQuery);
            return result.recordset;
        } catch (error) {
            console.error("Lỗi Model getAllAdmin:", error.message);
            throw error;
        }
    }
    // 2. Hàm thêm suất chiếu mới (Controller của bạn đang gọi hàm này)
    async create(data) {
        const pool = await poolPromise;

        // 1. Tìm các suất chiếu cùng ngày, cùng phòng
        const checkResult = await pool.request()
            .input('maPhong', sql.Int, data.maPhong)
            .input('ngay', sql.Date, data.ngay)
            .query(`
            SELECT 
                CONVERT(VARCHAR(5), sc.GIO_BAT_DAU, 108) AS GIO_BAT_DAU, 
                p.THOI_LUONG_PHIM, 
                p.TEN_PHIM 
            FROM SUAT_CHIEU sc
            JOIN PHIM p ON sc.MA_PHIM = p.MA_PHIM
            WHERE sc.MA_PHONG_CHIEU = @maPhong AND sc.NGAY_CHIEU = @ngay
        `);

        const gioMoiPhut = convertToMinutes(data.gio);
        const phimMoi = await pool.request()
            .input('id', sql.Int, data.maPhim)
            .query('SELECT THOI_LUONG_PHIM FROM PHIM WHERE MA_PHIM = @id');

        const thoiLuongMoi = phimMoi.recordset[0].THOI_LUONG_PHIM;

        for (let suat of checkResult.recordset) {
            const batDauCu = convertToMinutes(suat.GIO_BAT_DAU);
            const ketThucCu = batDauCu + suat.THOI_LUONG_PHIM + 20; // 20p dọn phòng

            // Kiểm tra trùng ca (Trùng giờ bắt đầu)
            if (data.gio === suat.GIO_BAT_DAU) {
                throw new Error(`Ca này đã có phim "${suat.TEN_PHIM}" đăng ký rồi Duy ơi!`);
            }

            // Kiểm tra va chạm thời gian thực tế
            const ketThucMoi = gioMoiPhut + thoiLuongMoi + 20;
            if ((gioMoiPhut < ketThucCu && gioMoiPhut >= batDauCu) ||
                (batDauCu < ketThucMoi && batDauCu >= gioMoiPhut)) {
                throw new Error(`Thời gian này đang bị cấn với phim "${suat.TEN_PHIM}" (kết thúc lúc ${formatMinutesToHHmm(ketThucCu)}).`);
            }
        }

        // 2. Nếu ổn thì mới thêm vào DB
        return await pool.request()
            .input('maPhim', sql.Int, data.maPhim)
            .input('maRap', sql.Int, data.maRap)     // <--- BỔ SUNG DÒNG NÀY ĐỂ LẤY RẠP
            .input('maPhong', sql.Int, data.maPhong)
            .input('ngay', sql.Date, data.ngay)
            .input('gio', sql.VarChar, data.gio)
            .input('gia', sql.Decimal, data.gia)
            .query(`
                INSERT INTO SUAT_CHIEU 
                (MA_PHIM, MA_RAP, MA_PHONG_CHIEU, NGAY_CHIEU, GIO_BAT_DAU, GIA_VE_CO_BAN, TRANG_THAI) 
                VALUES 
                (@maPhim, @maRap, @maPhong, @ngay, @gio, @gia, 1)
            `);
    }
    async checkDaMuaVe(maND, maPhim) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('uId', sql.Int, maND)
            .input('pId', sql.Int, maPhim)
            .query(`
                SELECT TOP 1 1 AS IsBought
                FROM HOA_DON hd
                JOIN SUAT_CHIEU sc ON hd.MA_SUAT_CHIEU = sc.MA_SUAT_CHIEU
                WHERE hd.MA_NGUOI_DUNG = @uId 
                  AND hd.TRANG_THAI_THANH_TOAN = N'Đã thanh toán'
                  AND sc.MA_PHIM = @pId
            `);
        // Trả về true nếu có kết quả (Đã mua), false nếu mảng rỗng (Chưa mua)
        return result.recordset.length > 0;
    }
    async delete(id) {
        const pool = await poolPromise;
        return await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE SUAT_CHIEU SET TRANG_THAI = 0 WHERE MA_SUAT_CHIEU = @id');
    }
}
function convertToMinutes(timeStr) {
    if (!timeStr) return 0;
    // Ép kiểu chắc chắn về String trước khi split để chống lỗi crash Server
    const [hours, minutes] = String(timeStr).split(':').map(Number);
    return hours * 60 + minutes;
}

function formatMinutesToHHmm(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
module.exports = new SuatChieuModel();