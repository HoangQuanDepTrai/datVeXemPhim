// Khởi tạo các biến global
const urlParams = new URLSearchParams(window.location.search);
const currentMaSuatChieu = urlParams.get('maSuatChieu') || urlParams.get('id');
let selectedSeats = [];
let basePrice = 0; // Thêm biến lưu giá vé cơ bản

// Hàm khởi chạy khi trang web tải xong
document.addEventListener('DOMContentLoaded', function () {
    if (!currentMaSuatChieu) {
        alert('Không tìm thấy thông tin suất chiếu!');
        window.location.href = '/';
        return;
    }
    loadShowtimeInfo();
    loadSeatMap();
});

// 1. Lấy thông tin suất chiếu từ API để hiển thị lên Sidebar
async function loadShowtimeInfo() {
    try {
        const res = await fetch(`/api/suat-chieu/thong-tin/${currentMaSuatChieu}`);
        const result = await res.json();
        if (result.success && result.data) {
            const data = result.data;
            document.getElementById('display-movie-name').innerText = data.TEN_PHIM;
            document.getElementById('display-cinema-room').innerText = `${data.TEN_RAP} - ${data.TEN_PHONG_CHIEU}`;
            document.getElementById('display-time').innerText = `Giờ chiếu: ${data.GIO_FORMAT} - ${data.NGAY_FORMAT}`;

            // --- QUAN TRỌNG: GÁN POSTER VÀO NỀN BODY ---
            if (data.HINH_ANH_POSTER) {
                // Gán link ảnh vào biến CSS --poster-url
                document.body.style.setProperty('--poster-url', `url('${data.HINH_ANH_POSTER}')`);
            }

            // Lưu giá vé cơ bản để tính tiền
            basePrice = parseFloat(data.GIA_VE_CO_BAN) || 0;
        }
    } catch (error) {
        console.error("Lỗi load thông tin suất chiếu:", error);
    }
}

// 2. Lấy dữ liệu ghế từ API và Render ra giao diện
async function loadSeatMap() {
    try {
        const res = await fetch(`/api/ghe/sodo/${currentMaSuatChieu}`);
        const result = await res.json();
        const seatMap = document.getElementById('seat-map');
        seatMap.innerHTML = '';

        if (!result.success || !result.data || result.data.length === 0) {
            seatMap.innerHTML = '<div class="alert alert-warning m-5">Phòng chiếu này chưa được thiết lập sơ đồ ghế.</div>';
            return;
        }

        // --- CẤU TRÚC VẼ GHẾ THEO HÀNG --- //
        const rows = {};

        // Gom ghế theo hàng (Dựa vào chữ cái đầu của TEN_GHE_NGOI)
        result.data.forEach(seat => {
            if (seat.TEN_GHE_NGOI) {
                const rowLetter = seat.TEN_GHE_NGOI.charAt(0);
                if (!rows[rowLetter]) rows[rowLetter] = [];
                rows[rowLetter].push(seat);
            }
        });

        // Vòng lặp vẽ từng hàng
        Object.keys(rows).forEach(rowLetter => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';

            // Nhãn tên hàng (A, B, C...) ở đầu
            const labelLeft = document.createElement('div');
            labelLeft.className = 'text-warning fw-bold d-flex align-items-center justify-content-center';
            labelLeft.style.width = '30px';
            labelLeft.innerText = rowLetter;
            rowDiv.appendChild(labelLeft);

            // Vòng lặp vẽ từng ghế trong hàng
            rows[rowLetter].forEach(seat => {
                const seatDiv = document.createElement('div');
                seatDiv.className = 'seat-item';
                seatDiv.innerText = seat.TEN_GHE_NGOI;

                // Set class VIP nếu có phụ phí
                if (parseFloat(seat.GIA_GHE_NGOI) > 0) {
                    seatDiv.classList.add('vip');
                }

                // ==========================================
                // KIỂM TRA TRẠNG THÁI GHẾ VÀ CHẶN CLICK
                // ==========================================
                const loaiGhe = seat.TRANG_THAI_GHE || 'Thường';
                const isHong = (loaiGhe.toLowerCase() === 'hỏng' || loaiGhe.toLowerCase() === 'hư hỏng');

                if (isHong) {
                    // Nếu ghế hỏng -> Chặn màu đen
                    seatDiv.classList.add('seat-hong');
                    seatDiv.title = 'Ghế đang bảo trì';
                } else if (seat.DA_DAT == 1) {
                    // Nếu ghế đã đặt -> Chặn màu đỏ mờ
                    seatDiv.classList.add('occupied');
                    seatDiv.title = 'Ghế đã có người đặt';
                } else {
                    // Nếu ghế trống -> Cho phép click
                    seatDiv.classList.add('available');
                    seatDiv.title = `Ghế ${seat.TEN_GHE_NGOI}`;
                    seatDiv.onclick = () => toggleSeat(seatDiv, seat);
                }

                rowDiv.appendChild(seatDiv);
            });

            // Nhãn tên hàng ở cuối (cho cân xứng)
            const labelRight = labelLeft.cloneNode(true);
            rowDiv.appendChild(labelRight);

            seatMap.appendChild(rowDiv);
        });
    } catch (error) {
        console.error("Lỗi load sơ đồ ghế:", error);
        document.getElementById('seat-map').innerHTML = '<div class="text-danger p-5">Lỗi kết nối dữ liệu ghế!</div>';
    }
}

// 3. Xử lý khi click chọn ghế
function toggleSeat(element, seat) {
    element.classList.toggle('selected');

    if (element.classList.contains('selected')) {
        selectedSeats.push(seat);
    } else {
        // Nếu bỏ chọn, xóa ghế khỏi mảng (Dùng MA_GHE_NGOI)
        selectedSeats = selectedSeats.filter(s => s.MA_GHE_NGOI !== seat.MA_GHE_NGOI);
    }
    updateUI();
}

// 4. Cập nhật Sidebar Thông tin đơn hàng
function updateUI() {
    const seatListContainer = document.getElementById('selected-seats-text');
    const totalPriceElement = document.getElementById('total-price');

    if (selectedSeats.length > 0) {
        // 1. Tạo danh sách chi tiết từng ghế
        let listHtml = '<div class="selected-seats-list mt-2">';

        selectedSeats.forEach(seat => {
            const phuPhi = parseFloat(seat.GIA_GHE_NGOI) || 0;
            const itemPrice = basePrice + phuPhi;

            listHtml += `
                <div class="d-flex justify-content-between align-items-center mb-2" style="font-size: 0.9rem;">
                    <span>
                        <i class="fas fa-chair me-2 ${phuPhi > 0 ? 'text-warning' : 'text-secondary'}"></i>
                        Ghế <b class="text-white">${seat.TEN_GHE_NGOI}</b> 
                        ${phuPhi > 0 ? '<span class="badge bg-danger ms-1" style="font-size: 0.7rem;">VIP</span>' : ''}
                    </span>
                    <span class="text-warning">${itemPrice.toLocaleString('vi-VN')} đ</span>
                </div>
            `;
        });

        listHtml += '</div>';

        // Thay vì chỉ gán text, chúng ta gán innerHTML để hiển thị danh sách
        seatListContainer.innerHTML = listHtml;

    } else {
        seatListContainer.innerText = 'Chưa chọn';
    }

    // 2. Tính tổng tiền
    const totalTicketPrice = selectedSeats.reduce((sum, seat) => {
        const phuPhi = parseFloat(seat.GIA_GHE_NGOI) || 0;
        return sum + basePrice + phuPhi;
    }, 0);

    totalPriceElement.innerText = totalTicketPrice.toLocaleString('vi-VN') + ' VNĐ';
}

// =========================================================
// PHẦN CHỌN BẮP NƯỚC VÀ XÁC NHẬN
// =========================================================
let selectedCombos = {};

async function confirmBooking() {
    if (selectedSeats.length === 0) return alert("Vui lòng chọn ít nhất 1 ghế trước!");

    const modalElement = document.getElementById('productModal');
    const myModal = new bootstrap.Modal(modalElement);
    myModal.show();

    const listArea = document.getElementById('product-list');
    listArea.innerHTML = '<div class="text-center w-100 p-4">Đang tải quà tặng...</div>';

    try {
        const res = await fetch('/api/san-pham');
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            listArea.innerHTML = result.data.map(p => `
                <div class="col-md-6 mb-3">
                    <div class="p-2 border border-secondary rounded d-flex align-items-center justify-content-between bg-dark shadow-sm">
                        <div class="d-flex align-items-center">
                            <img src="${p.url_image || '/images/default-popcorn.png'}" 
                                 style="width:55px; height:55px; object-fit:cover;" class="rounded me-2">
                            <div>
                                <div class="fw-bold small text-white">${p.TEN_SAN_PHAM}</div>
                                <div class="text-warning small">${parseFloat(p.GIA_SAN_PHAM).toLocaleString()}đ</div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <button class="btn btn-sm btn-outline-danger px-2 py-0" 
                                onclick="updateCombo(${p.MA_SAN_PHAM}, -1, ${p.GIA_SAN_PHAM})">-</button>
                            <span id="qty-${p.MA_SAN_PHAM}" class="fw-bold">0</span>
                            <button class="btn btn-sm btn-danger px-2 py-0" 
                                onclick="updateCombo(${p.MA_SAN_PHAM}, 1, ${p.GIA_SAN_PHAM})">+</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            listArea.innerHTML = '<p class="text-center w-100 opacity-50">Không tìm thấy sản phẩm nào trong kho.</p>';
        }
    } catch (err) {
        listArea.innerHTML = '<p class="text-center text-danger w-100">Lỗi kết nối API quà tặng!</p>';
        console.error(err);
    }
    updateFinalTotal();
}

function updateCombo(id, delta, price) {
    if (!selectedCombos[id]) {
        selectedCombos[id] = { qty: 0, price: parseFloat(price) };
    }
    selectedCombos[id].qty += delta;
    if (selectedCombos[id].qty < 0) selectedCombos[id].qty = 0;

    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.innerText = selectedCombos[id].qty;

    updateFinalTotal(); // Gọi hàm cập nhật tổng tiền
}

function updateFinalTotal() {
    // 1. Tiền ghế
    const totalGhe = selectedSeats.reduce((sum, s) => sum + basePrice + (parseFloat(s.GIA_GHE_NGOI) || 0), 0);

    // 2. Tiền Combo (Đã thêm nhân số lượng)
    let totalCombo = 0;
    for (let id in selectedCombos) {
        totalCombo += selectedCombos[id].qty * selectedCombos[id].price;
    }

    const totalFinal = totalGhe + totalCombo;
    const el = document.getElementById('total-final');
    if (el) el.innerText = totalFinal.toLocaleString('vi-VN') + " VNĐ";
}

function goToPayment() {
    if (selectedSeats.length === 0) {
        alert("Vui lòng chọn ít nhất 1 ghế!");
        return;
    }

    const seatIds = selectedSeats.map(s => s.MA_GHE_NGOI).join(',');
    const comboData = Object.keys(selectedCombos)
        .filter(id => selectedCombos[id].qty > 0)
        .map(id => `${id}:${selectedCombos[id].qty}`)
        .join('|');

    window.location.href = `/thanhtoan?maSC=${currentMaSuatChieu}&ghes=${seatIds}&combos=${comboData}`;
}