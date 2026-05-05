/* public/js/thanhtoan.js */
const params = new URLSearchParams(window.location.search);
const [maSC, ghesStr, combosStr] = ['maSC', 'ghes', 'combos'].map(k => params.get(k));

let finalTotalAmount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadOrderDetails();
});

function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert("Vui lòng đăng nhập để tiếp tục.");
        return window.location.href = '/login';
    }

    const fields = { cus_name: 'HO_TEN', cus_phone: 'SO_DIEN_THOAI', cus_email: 'EMAIL' };
    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) {
            el.value = user[fields[id]] || '';
            el.readOnly = true;
        }
    }
}

async function loadOrderDetails() {
    const body = document.getElementById('billing-body');
    if (!body) return;

    try {
        const [resSC, resGhe, resSp] = await Promise.all([
            fetch(`/api/suat-chieu/thong-tin/${maSC}`).then(r => r.json()),
            fetch(`/api/ghe/sodo/${maSC}`).then(r => r.json()),
            combosStr ? fetch('/api/san-pham').then(r => r.json()) : Promise.resolve({ success: true, data: [] })
        ]);

        const basePrice = Number(resSC.data?.GIA_VE_CO_BAN) || 0;
        const selectedGheIds = ghesStr ? ghesStr.split(',') : [];
        let htmlRows = "";
        finalTotalAmount = 0;

        // 1. NHÓM GHẾ NGỒI (Căn giữa tiêu đề)
        if (resGhe.success && resGhe.data) {
            const selectedGhes = resGhe.data.filter(g => selectedGheIds.includes(String(g.MA_GHE_NGOI)));
            if (selectedGhes.length > 0) {
                htmlRows += `
                    <tr class="group-header text-center">
                        <td colspan="3" class="py-2 fw-bold text-uppercase small" style="letter-spacing: 1px;">
                            <i class="fas fa-couch me-2"></i>Ghế ngồi
                        </td>
                    </tr>`;
                selectedGhes.forEach(g => {
                    const phuPhi = Number(g.PHU_PHI_GHE) || 0;
                    const price = basePrice + phuPhi;
                    finalTotalAmount += price;
                    htmlRows += `<tr>
                        <td class="ps-4">Ghế ${g.TEN_GHE_NGOI} ${phuPhi > 0 ? '<span class="badge bg-danger ms-1">VIP</span>' : ''}</td>
                        <td class="text-center">1</td>
                        <td class="text-end fw-bold">${price.toLocaleString('vi-VN')} đ</td>
                    </tr>`;
                });
            }
        }

        // 2. NHÓM BẮP NƯỚC (Căn giữa tiêu đề)
        if (combosStr && resSp.success && resSp.data) {
            const items = combosStr.split('|');
            let hasComboHead = false;

            items.forEach(item => {
                const parts = item.split(':');
                const id = parts[0];
                const qty = Number(parts[1]) || 0;
                const product = resSp.data.find(x => String(x.MA_SAN_PHAM) === String(id));

                if (product && qty > 0) {
                    if (!hasComboHead) {
                        htmlRows += `
                            <tr class="group-header text-center">
                                <td colspan="3" class="py-2 fw-bold text-uppercase small" style="letter-spacing: 1px;">
                                    <i class="fas fa-popcorn me-2"></i>Bắp nước & Combo
                                </td>
                            </tr>`;
                        hasComboHead = true;
                    }
                    const unitPrice = Number(product.GIA_SAN_PHAM) || 0;
                    const subTotal = unitPrice * qty;
                    finalTotalAmount += subTotal;

                    htmlRows += `<tr>
                        <td class="ps-4">${product.TEN_SAN_PHAM}</td>
                        <td class="text-center">${qty}</td>
                        <td class="text-end fw-bold">${subTotal.toLocaleString('vi-VN')} đ</td>
                    </tr>`;
                }
            });
        }

        body.innerHTML = htmlRows || '<tr><td colspan="3" class="text-center py-5 text-muted border-0">Đơn hàng trống</td></tr>';
        
        const finalTotalEl = document.getElementById('final-total');
        if (finalTotalEl) {
            finalTotalEl.innerText = finalTotalAmount.toLocaleString('vi-VN') + " VNĐ";
        }

    } catch (err) {
        console.error("Lỗi:", err);
        body.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Lỗi tải dữ liệu đơn hàng.</td></tr>';
    }
}

async function submitOrder() {
    const user = JSON.parse(localStorage.getItem('user'));
    const btn = document.getElementById('btnPayment'); 
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang xử lý...';
    }

    try {
        const res = await fetch('/api/ve/dat-ve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                maNguoiDung: user.MA_NGUOI_DUNG,
                maSuatChieu: parseInt(maSC),
                danhSachMaGhe: ghesStr.split(',').map(Number),
                tongTien: finalTotalAmount
            })
        });

        const result = await res.json();
        if (result.success && result.paymentUrl) {
            window.location.href = result.paymentUrl;
        } else {
            throw new Error(result.message || "Lỗi tạo giao dịch");
        }
    } catch (error) {
        alert(error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'XÁC NHẬN THANH TOÁN';
        }
    }
}