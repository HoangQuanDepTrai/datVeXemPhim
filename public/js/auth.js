/**
 * Vai trò: Xử lý tương tác giao diện, Login/Logout ngầm (AJAX) và quản lý LocalStorage.
 */

// 1. Hàm kiểm tra trạng thái đăng nhập để vẽ lại giao diện Header
function checkLogin() {
    const userData = localStorage.getItem('user');
    const userInfoDiv = document.getElementById('user-info');
    if (!userInfoDiv) return;

    if (userData) {
        try {
            const user = JSON.parse(userData);
            const isAdmin = Number(user.MA_VAI_TRO) === 1;

            // Chọn nút chức năng dựa trên quyền hạn
            const actionBtn = isAdmin
                ? `<a href="/admin" class="btn btn-danger btn-sm rounded-pill px-3 fw-bold shadow-sm">
                <i class="bi bi-shield-lock-fill me-1"></i>Quản Trị
               </a>`
                : `<a href="/lich-su?maND=${user.MA_NGUOI_DUNG}" class="btn btn-outline-danger btn-sm rounded-pill px-3 fw-medium shadow-sm">
                Vé của tôi
               </a>`;

            // Render giao diện: Biến cụm Tên thành link trỏ vào /profile
            userInfoDiv.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            ${actionBtn}
            
            <a href="/profile" class="text-decoration-none d-flex align-items-center gap-2 py-1 px-2 rounded-pill bg-light border hover-pink shadow-sm" title="Xem hồ sơ cá nhân">
                <i class="bi bi-person-circle text-secondary fs-5 ms-1"></i>
                <span class="text-dark fw-bold text-truncate" style="max-width: 120px; font-size: 14px;">
                    ${user.HO_TEN}
                </span>
            </a>

            <button onclick="logout()" class="btn btn-light btn-sm rounded-pill px-3 text-secondary border fw-medium shadow-sm">
                Thoát
            </button>
        </div>`;
        } catch (e) {
            console.error("Lỗi parse dữ liệu người dùng:", e);
            localStorage.removeItem('user');
        }
    }
}

// 2. Hàm xử lý Đăng nhập qua API
async function handleAuth() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Hiển thị Loading mượt mà
    Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng chờ trong giây lát',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();

        if (result.success) {
            // Lưu dữ liệu vào LocalStorage để Client xử lý nhanh
            localStorage.setItem('user', JSON.stringify(result.user));

            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Chào mừng bạn quay lại!',
                timer: 1500,
                showConfirmButton: false
            });

            // Chuyển hướng sau 1.5s để Server kịp ổn định Session
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi!', text: result.message || 'Sai tài khoản hoặc mật khẩu!' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Lỗi kết nối máy chủ!' });
    }
}
//---ĐỔI mật khẩu---
async function handleChangePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 1. Kiểm tra nhanh ở Client
    if (newPassword !== confirmPassword) {
        return Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Mật khẩu mới không khớp!' });
    }

    Swal.fire({ title: 'Đang xử lý...', didOpen: () => { Swal.showLoading(); } });

    try {
        // 2. Gửi yêu cầu PUT đến Backend (Đường dẫn này Duy đang thiếu)
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã đổi mật khẩu!' });
            // Reset form sau khi thành công
            document.getElementById('changePasswordForm').reset();
        } else {
            Swal.fire({ icon: 'error', title: 'Thất bại', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể kết nối Server' });
    }
}

// 3. Hàm xử lý Đăng xuất (Gộp làm 1 hàm duy nhất)
window.logout = function () {
    Swal.fire({
        title: 'Bạn muốn đăng xuất?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d82f8b', // Màu hồng MoMo chuẩn
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            // Xóa ở máy khách
            localStorage.removeItem('user');
            // Chuyển hướng đến route logout ở Backend để xóa Session[cite: 5]
            window.location.href = '/api/auth/logout';
        }
    });
};

// 4. Lắng nghe sự kiện khi trang đã sẵn sàng
document.addEventListener('DOMContentLoaded', function () {
    // Tự động kiểm tra trạng thái login để vẽ lại Header
    checkLogin();

    // Gán sự kiện submit cho form đăng nhập nếu có
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await handleAuth();
        });
    }
});