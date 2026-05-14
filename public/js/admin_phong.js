$(document).ready(function () {
    // 0. Khởi tạo DataTables
    if ($('#tablePhong').length) {
        const t = $('#tablePhong').DataTable({
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json"
            },
            "pageLength": 10,
            "columnDefs": [
                { "searchable": false, "orderable": false, "targets": 0 },
                { "orderable": false, "targets": 4 } // Tắt nút mũi tên ở cột Hành động
            ],
            "order": [[1, 'asc']]
        });
        t.on('order.dt search.dt', function () {
            let i = 1;
            t.cells(null, 0, { search: 'applied', order: 'applied' }).every(function () {
                this.data(i++);
            });
        }).draw();
    }

    let danhSachPhongData = [];

    // 1. KHI CHỌN RẠP -> TẢI DANH SÁCH PHÒNG
    $('#selectRap').change(async function () {
        const maRap = $(this).val();
        const selPhong = $('#selectPhong');

        selPhong.html('<option value="">-- Chọn Phòng --</option>');
        $('#btnXemSoDo, #btnTaoSoDo').prop('disabled', true);
        $('#seatMapContainer').html('<div class="text-muted py-5 mt-5"><i class="bi bi-display" style="font-size: 4rem; opacity: 0.5;"></i><p class="mt-3 fs-5">Vui lòng chọn Phòng chiếu</p></div>');

        if (!maRap) {
            selPhong.prop('disabled', true);
            return;
        }

        try {
            // API Cũ của bạn (Hãy đảm bảo nó trả về danh sách phòng đúng chuẩn nhé)
            const res = await fetch(`/admin/api/phongs-by-rap/${maRap}`);
            const result = await res.json();

            const phongs = result.data || result; // Tự động lấy data nếu có bọc

            if (Array.isArray(phongs) && phongs.length > 0) {
                selPhong.prop('disabled', false);
                phongs.forEach(phong => {
                    const idPhong = phong._id || phong.MA_PHONG || phong.MA_PHONG_CHIEU;
                    const tenPhong = phong.tenPhongChieu || phong.TEN_PHONG || phong.TEN_PHONG_CHIEU;
                    selPhong.append(`<option value="${idPhong}">${tenPhong}</option>`);
                });
            } else {
                selPhong.html('<option value="">Rạp này chưa có phòng nào</option>');
                selPhong.prop('disabled', true);
            }
        } catch (err) {
            selPhong.html('<option value="">Lỗi tải dữ liệu</option>');
        }
    });

    // 2. KHI CHỌN PHÒNG -> MỞ KHÓA CÁC NÚT
    $('#selectPhong').change(function () {
        if ($(this).val()) {
            $('#btnXemSoDo, #btnTaoSoDo').prop('disabled', false);
        } else {
            $('#btnXemSoDo, #btnTaoSoDo').prop('disabled', true);
        }
    });

    // ========================================================
    // 3. XEM SƠ ĐỒ GHẾ TRÊN MÀN HÌNH CHÍNH
    // ========================================================
    $('#btnXemSoDo').click(async function () {
        const maPhong = $('#selectPhong').val();
        const container = $('#seatMapContainer');
        container.html('<div class="spinner-border text-danger mt-5"></div><p class="mt-2 text-white">Đang tải sơ đồ...</p>');

        try {
            // Đường dẫn fetch này đang giữ đúng theo code bạn gửi
            const response = await fetch(`/admin/phong/${maPhong}/ghe`);
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                const seatMap = {};

                // Gom nhóm ghế theo chữ cái đầu
                result.data.forEach(ghe => {
                    const tenGhe = ghe.tenGheNgoi || ghe.TEN_GHE_NGOI;
                    const row = tenGhe.charAt(0);
                    if (!seatMap[row]) seatMap[row] = [];
                    seatMap[row].push(ghe);
                });

                let html = `<div class="screen-area w-75 text-dark mb-4">MÀN HÌNH CHIẾU</div>`;

                // Bắt đầu lặp từng hàng ghế (A, B, C...)
                for (let row in seatMap) {
                    // 1. MỞ HÀNG GHẾ MỚI
                    html += `<div class="seat-row" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 8px;">`;

                    // In chữ cái đầu hàng (Trái)
                    html += `<div style="width: 30px; line-height: 35px; font-weight: bold; text-align: right; margin-right: 15px; color: #ffc107;">${row}</div>`;

                    // Sắp xếp ghế theo số thứ tự (1, 2, 3...)
                    seatMap[row].sort((a, b) => {
                        const numA = parseInt((a.tenGheNgoi || a.TEN_GHE_NGOI).substring(1));
                        const numB = parseInt((b.tenGheNgoi || b.TEN_GHE_NGOI).substring(1));
                        return numA - numB;
                    });

                    // 2. IN TỪNG GHẾ TRONG HÀNG
                    seatMap[row].forEach(ghe => {
                        const loai = ghe.loaiGhe || ghe.TRANG_THAI_GHE || 'Thuong';
                        const tenGhe = ghe.tenGheNgoi || ghe.TEN_GHE_NGOI;

                        // Kiểm tra xem ghế có hỏng không
                        let isHong = (loai.toLowerCase() === 'hỏng' || loai.toLowerCase() === 'hư hỏng');

                        // Gán màu: Đen (Hỏng) - Đỏ (VIP) - Xám (Thường)
                        let seatClass = isHong ? 'seat-hong' : (loai.toLowerCase() === 'vip' ? 'seat-vip' : 'seat-thuong');
                        const titleText = isHong ? `Ghế: ${tenGhe} (ĐANG BẢO TRÌ)` : `Ghế: ${tenGhe}`;

                        html += `<div class="seat ${seatClass}" title="${titleText}">${tenGhe}</div>`;
                    });

                    // In chữ cái cuối hàng (Phải)
                    html += `<div style="width: 30px; line-height: 35px; font-weight: bold; text-align: left; margin-left: 15px; color: #ffc107;">${row}</div>`;

                    // 3. ĐÓNG HÀNG GHẾ (Lúc nãy Duy bị thiếu dòng này nè)
                    html += `</div>`;
                }
                // Gắn vào giao diện
                container.html(html);
            } else {
                container.html('<p class="text-warning mt-5"><i class="bi bi-exclamation-triangle fs-1 d-block mb-3"></i>Phòng này chưa được tạo ghế!</p>');
            }
        } catch (err) {
            container.html('<p class="text-danger mt-5">Lỗi kết nối máy chủ!</p>');
        }
    }); // <--- QUAN TRỌNG: Dấu đóng của chức năng số 3 phải nằm ở đây!


    // ========================================================
    // 4. CLICK NÚT "XEM SƠ ĐỒ" TỪ DANH SÁCH BẢNG
    // ========================================================
    $(document).on('click', '.btn-xem-sodo-list', function () {
        const maPhong = $(this).attr('data-id');
        const tenPhong = $(this).attr('data-ten');

        // 1. Nếu trong ô Select chưa có phòng này, tự động thêm vào tạm
        if ($('#selectPhong option[value="' + maPhong + '"]').length === 0) {
            $('#selectPhong').append(`<option value="${maPhong}">${tenPhong}</option>`);
        }

        // 2. Ép Dropdown chọn đúng phòng này
        $('#selectPhong').val(maPhong);
        $('#btnXemSoDo, #btnTaoSoDo').prop('disabled', false);

        // 3. Tự động "bấm hộ" cái nút Xem Sơ Đồ ở phía trên
        $('#btnXemSoDo').click();

        // 4. Hiệu ứng cuộn màn hình trượt lên
        $('html, body').animate({
            scrollTop: $('.card').first().offset().top - 20
        }, 500);
    });

    // -------------------------------------------------------------
    // CHỨC NĂNG TẠO GHẾ TRỰC QUAN MỚI
    // -------------------------------------------------------------
    // Lấy ID phòng khi mở Modal
    $('#modalInteractiveSeats').on('show.bs.modal', function () {
        $('#genMaPhong').val($('#selectPhong').val());
    });

    // Vẽ sơ đồ nháp
    $('#btnPreviewMap').click(function () {
        const soHang = parseInt($('#inputSoHang').val());
        const soCot = parseInt($('#inputSoCot').val());

        if (!soHang || !soCot || soHang > 26 || soCot > 50) {
            return Swal.fire('Lỗi', 'Vui lòng nhập số hàng và cột hợp lệ', 'error');
        }

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let html = '';

        for (let i = 0; i < soHang; i++) {
            const rowLetter = alphabet[i];
            html += `<div class="seat-row">`;
            html += `<div class="text-white" style="width: 30px; line-height: 35px; font-weight: bold; text-align: right; margin-right: 10px;">${rowLetter}</div>`;

            for (let j = 1; j <= soCot; j++) {
                const tenGhe = rowLetter + j;
                // Mặc định 3 hàng đầu (C, D, E v.v tùy bạn) là VIP. Ở đây set 3 hàng cuối nếu cần, tạm set 3 hàng đầu
                const isVip = false; // Mặc định tất cả là thường cho dễ edit
                const defaultClass = isVip ? 'seat-vip' : 'seat-thuong';
                const loaiGhe = isVip ? 'VIP' : 'Thuong';

                html += `<div class="seat seat-interactive ${defaultClass}" 
                                      data-ten="${tenGhe}" 
                                      data-loai="${loaiGhe}" 
                                      title="${tenGhe}">${tenGhe}</div>`;
            }
            html += `</div>`;
        }

        $('#previewSeatsHTML').html(html);
        $('#previewMapContainer').slideDown();
        $('#btnSaveCustomMap').show();
    });

    // Click vào ghế trong bản nháp để đổi loại (Thường -> VIP -> Trống)
    $(document).on('click', '.seat-interactive', function () {
        const currentType = $(this).attr('data-loai');

        if (currentType === 'Thuong') {
            $(this).removeClass('seat-thuong').addClass('seat-vip').attr('data-loai', 'VIP');
        } else if (currentType === 'VIP') {
            $(this).removeClass('seat-vip').addClass('seat-trong').attr('data-loai', 'Trong');
            $(this).text('');
        } else {
            $(this).removeClass('seat-trong').addClass('seat-thuong').attr('data-loai', 'Thuong');
            $(this).text($(this).attr('data-ten'));
        }
    });

    // LƯU SƠ ĐỒ VỀ BACKEND SQL SERVER
    $('#btnSaveCustomMap').click(async function () {
        const maPhong = $('#genMaPhong').val();
        let danhSachGhe = [];

        // Lấy tất cả ghế trừ những ghế 'Trống'
        $('.seat-interactive').each(function () {
            const loai = $(this).attr('data-loai');
            if (loai !== 'Trong') {
                danhSachGhe.push({
                    tenGhe: $(this).attr('data-ten'),
                    loaiGhe: loai, // 'Thuong' hoặc 'VIP'
                    giaGhe: loai === 'VIP' ? 20000 : 0 // Ghế VIP phụ thu 20k
                });
            }
        });

        if (danhSachGhe.length === 0) return Swal.fire('Lỗi', 'Sơ đồ chưa có ghế nào!', 'error');

        try {
            Swal.fire({ title: 'Đang lưu sơ đồ...', didOpen: () => Swal.showLoading() });

            // GỌI API BACKEND: Truyền lên ID phòng và Mảng danhSachGhe
            const res = await fetch('/admin/ghe/generate-custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    maPhong: maPhong,
                    danhSachGhe: danhSachGhe
                })
            });

            const result = await res.json();
            if (result.success) {
                $('#modalInteractiveSeats').modal('hide');
                Swal.fire('Thành công!', 'Đã lưu cấu hình sơ đồ ghế mới!', 'success');
                $('#btnXemSoDo').click(); // Reload lại map trên màn hình
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (err) {
            Swal.fire('Lỗi', 'Không thể gửi dữ liệu đến server', 'error');
        }
    });
    //Sửa sơ đồ ghế từ danh sách
    $(document).on('click', '.btn-sua-sodo-list', async function () {
        const maPhong = $(this).attr('data-id');
        const tenPhong = $(this).attr('data-ten');

        $('#editRoomName').text(tenPhong);
        $('#modalEditSeats').modal('show');
        $('#editSeatsHTML').html('<div class="spinner-border text-danger mt-5"></div>');

        try {
            const response = await fetch(`/admin/phong/${maPhong}/ghe`);
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                const seatMap = {};
                result.data.forEach(ghe => {
                    const row = (ghe.tenGheNgoi || ghe.TEN_GHE_NGOI).charAt(0);
                    if (!seatMap[row]) seatMap[row] = [];
                    seatMap[row].push(ghe);
                });

                let html = '';
                for (let row in seatMap) {
                    html += `<div class="seat-row">`;
                    html += `<div style="width: 30px; line-height: 35px; font-weight: bold; text-align: right; margin-right: 15px; color: #ffc107;">${row}</div>`;

                    seatMap[row].sort((a, b) => parseInt((a.tenGheNgoi || a.TEN_GHE_NGOI).substring(1)) - parseInt((b.tenGheNgoi || b.TEN_GHE_NGOI).substring(1)));

                    seatMap[row].forEach(ghe => {
                        const maGhe = ghe.MA_GHE_NGOI;
                        const tenGhe = ghe.tenGheNgoi || ghe.TEN_GHE_NGOI;
                        const loaiGhe = ghe.loaiGhe || ghe.TRANG_THAI_GHE || 'Thường';

                        // Kiểm tra xem ghế có đang hỏng không
                        let isHong = (loaiGhe.toLowerCase() === 'hỏng' || loaiGhe.toLowerCase() === 'hư hỏng');
                        let seatClass = isHong ? 'seat-hong' : (loaiGhe.toLowerCase() === 'vip' ? 'seat-vip' : 'seat-thuong');

                        // Lưu lại trạng thái GỐC để nếu phục hồi thì biết đường về lại VIP hay Thường
                        const originLoai = isHong ? (ghe.GIA_GHE_NGOI > 0 ? 'VIP' : 'Thường') : loaiGhe;

                        html += `<div class="seat seat-edit-mode ${seatClass}" 
                                              data-id="${maGhe}" 
                                              data-loai="${loaiGhe}" 
                                              data-origin="${originLoai}">${tenGhe}</div>`;
                    });
                    html += `</div>`;
                }
                $('#editSeatsHTML').html(html);
            } else {
                $('#editSeatsHTML').html('<p class="text-white mt-5">Phòng chưa có ghế!</p>');
            }
        } catch (err) {
            $('#editSeatsHTML').html('<p class="text-danger mt-5">Lỗi kết nối máy chủ!</p>');
        }
    });

    // 2. CLICK VÀO GHẾ TRONG MODAL -> Đổi trạng thái (Bình thường <-> Hỏng)
    $(document).on('click', '.seat-edit-mode', function () {
        const isHong = $(this).hasClass('seat-hong');
        const originLoai = $(this).attr('data-origin');

        if (isHong) {
            // Phục hồi lại trạng thái gốc
            $(this).removeClass('seat-hong').attr('data-loai', originLoai);
            if (originLoai.toLowerCase() === 'vip') {
                $(this).addClass('seat-vip');
            } else {
                $(this).addClass('seat-thuong');
            }
        } else {
            // Đánh dấu là Hỏng
            $(this).removeClass('seat-vip seat-thuong').addClass('seat-hong').attr('data-loai', 'Hỏng');
        }

        // Đánh dấu class 'is-changed' để tí nữa chỉ gửi những ghế bị thay đổi lên Server cho nhẹ
        $(this).addClass('is-changed');
    });

    // 3. BẤM LƯU THAY ĐỔI
    $('#btnSaveEditedSeats').click(async function () {
        const dsThayDoi = [];
        // Chỉ quét những ghế có đánh dấu đã bị click thay đổi
        $('.seat-edit-mode.is-changed').each(function () {
            dsThayDoi.push({
                maGhe: $(this).attr('data-id'),
                trangThaiMoi: $(this).attr('data-loai') // 'Hỏng', 'VIP', 'Thường'
            });
        });

        if (dsThayDoi.length === 0) return Swal.fire('Lưu ý', 'Bạn chưa thay đổi ghế nào!', 'info');

        try {
            Swal.fire({ title: 'Đang lưu...', didOpen: () => Swal.showLoading() });
            const res = await fetch('/admin/ghe/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seats: dsThayDoi })
            });

            const result = await res.json();
            if (result.success) {
                $('#modalEditSeats').modal('hide');
                Swal.fire('Thành công', 'Đã cập nhật trạng thái bảo trì ghế!', 'success');
                $('#btnXemSoDo').click(); // Tự động load lại màn hình đen bên ngoài để thấy ghế mờ đi
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            Swal.fire('Lỗi', 'Lỗi API Backend!', 'error');
        }
    });
});