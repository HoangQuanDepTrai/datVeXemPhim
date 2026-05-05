const { poolPromise, sql } = require('../config/db');

class PhongModel {
    // 1. Lấy danh sách tất cả phòng chiếu
    async getAll() {
        try {
            // Sử dụng poolPromise thay vì db.connect() để thống nhất
            const pool = await poolPromise;

            const querySql = `
                SELECT 
                    P.MA_PHONG_CHIEU, 
                    P.TEN_PHONG_CHIEU, 
                    R.TEN_RAP, 
                    COUNT(G.MA_PHONG_CHIEU) AS TONG_SO_GHE
                FROM PHONG_CHIEU P
                LEFT JOIN THONG_TIN_RAP R ON P.MA_RAP = R.MA_RAP
                LEFT JOIN GHE_NGOI G ON P.MA_PHONG_CHIEU = G.MA_PHONG_CHIEU
                GROUP BY 
                    P.MA_PHONG_CHIEU, 
                    P.TEN_PHONG_CHIEU, 
                    R.TEN_RAP;
            `;
            const result = await pool.request().query(querySql);
            return result.recordset;
        } catch (err) {
            console.error("Lỗi SQL trong getAll Phong:", err.message);
            return [];
        }
    }

    // Thêm vào class PhongModel
    async getByRap(maRap) {
        try {
            const pool = await poolPromise;
            console.log(`==> Đang tìm phòng cho Rạp ID: ${maRap}`); // LOG 1

            const result = await pool.request()
                .input('maRap', sql.Int, maRap)
                .query(`SELECT MA_PHONG_CHIEU, TEN_PHONG_CHIEU FROM PHONG_CHIEU WHERE MA_RAP = @maRap`);

            console.log(`==> Kết quả SQL: Tìm thấy ${result.recordset.length} phòng.`); // LOG 2
            return result.recordset;
        } catch (err) {
            console.error("Lỗi SQL getByRap:", err.message);
            return [];
        }
    }

    // 2. Thêm phòng chiếu mới
    async create(data) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('ten', sql.NVarChar, data.ten)
                .input('maRap', sql.Int, data.maRap)
                .query(`
                    INSERT INTO PHONG_CHIEU (TEN_PHONG_CHIEU, MA_RAP) 
                    OUTPUT INSERTED.MA_PHONG_CHIEU
                    VALUES (@ten, @maRap)
                `);

            console.log("=> Đã tạo phòng mới, ID:", result.recordset[0].MA_PHONG_CHIEU);
            return result;
        } catch (err) {
            console.error("Lỗi SQL trong create Phong:", err.message);
            throw err;
        }
    }
}

module.exports = new PhongModel();