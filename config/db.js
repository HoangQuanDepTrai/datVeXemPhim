const sql = require('mssql');
require('dotenv').config();

// Cấu hình kết nối lấy từ file .env
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, // Để false khi chạy localhost
        trustServerCertificate: true // Tránh lỗi chứng chỉ trên máy cục bộ
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Tạo kết nối tập trung (Connection Pool)
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối thành công tới SQL Server (Lớp DAL)'.green.bold);
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối Database: ', err);
        process.exit(1);
    });

module.exports = {
    sql,
    poolPromise
};