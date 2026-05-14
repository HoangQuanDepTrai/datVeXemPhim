// public/js/app.js

const API_URL = '/api';
let allMoviesList = [];

/**
 * --- PHẦN 1: GỌI API LẤY DANH SÁCH PHIM ---
 */
async function fetchMoviesForGrid() {
    const grid = document.getElementById('movie-grid');
    if (!grid) return; // Nếu không ở trang có grid thì bỏ qua

    grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-danger"></div><p class="mt-2 text-muted">Đang tải danh sách phim...</p></div>';

    try {
        const response = await fetch(`${API_URL}/phim/all`);
        const result = await response.json();

        allMoviesList = result.data || result;

        // Mặc định gọi hàm hiển thị tab "Đang chiếu"
        const currentStatus = document.querySelector('input[name="btnradio"]:checked')?.value || 'dang-chieu';
        renderMovieGrid(allMoviesList, currentStatus, '');

    } catch (err) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-danger">Lỗi kết nối lấy dữ liệu phim!</div>';
        console.error("Lỗi API phim:", err);
    }
}
/**
 * --- PHẦN 2: LỌC LOGIC VÀ VẼ GIAO DIỆN ---
 */
function renderMovieGrid(movies, statusFilter, searchQuery, genreFilter = 'all') {
    const grid = document.getElementById('movie-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // LỌC TỔNG HỢP: Từ khóa + Trạng thái + Thể loại
    let finalMovies = movies.filter(m => {
        // 1. Lọc theo từ khóa tìm kiếm
        const matchSearch = m.TEN_PHIM.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Lọc theo thể loại (Lấy từ Database TEN_THE_LOAI)
        const matchGenre = (genreFilter === 'all' || m.TEN_THE_LOAI === genreFilter);

        // 3. Lọc theo Ngày chiếu (Đang chiếu / Sắp chiếu)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const releaseDate = m.NGAY_KHOI_CHIEU ? new Date(m.NGAY_KHOI_CHIEU) : null;
        if (releaseDate) releaseDate.setHours(0, 0, 0, 0);

        let matchStatus = false;
        if (statusFilter === 'sap-chieu') {
            matchStatus = !releaseDate || releaseDate > today;
        } else {
            matchStatus = releaseDate && releaseDate <= today;
        }

        return matchSearch && matchGenre && matchStatus;
    });

    // Nếu không có phim nào sau khi lọc
    if (finalMovies.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="bi bi-search fs-1 d-block mb-3"></i>Không tìm thấy phim phù hợp với các tiêu chí lọc.</div>';
        return;
    }

    // Vẽ HTML (Giữ nguyên đoạn HTML cũ của Duy nhưng mình sửa lại class Card cho đồng bộ)
    finalMovies.forEach(phim => {
        const imgUrl = phim.HINH_ANH_POSTER || phim.HINH_ANH_NEN || '/images/default-poster.jpg';
        grid.innerHTML += `
        <div class="col">
            <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative pb-2 animate__animated animate__fadeInUp">
                <span class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 m-2 rounded-2 fw-bold shadow" style="font-size: 0.8rem; z-index: 2;">
                    ${phim.GIOI_HAN_TUOI || 'P'}+
                </span>
                <div class="movie-poster-wrapper position-relative" style="cursor: pointer;" onclick="openTrailerModal(this)"
                     data-id="${phim.MA_PHIM}" data-title="${phim.TEN_PHIM}" data-poster="${imgUrl}" data-desc="${phim.NOI_DUNG_PHIM}" data-trailer="${phim.DUONG_DAN_TRAILER}">
                    <img src="${imgUrl}" class="card-img-top w-100" style="height: 280px; object-fit: cover;" alt="${phim.TEN_PHIM}">
                    <div class="movie-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.3); opacity: 0; transition: 0.3s;">
                        <i class="bi bi-play-circle text-white shadow-sm" style="font-size: 3.5rem;"></i>
                    </div>
                </div>
                <div class="card-body d-flex flex-column p-3">
                    <h6 class="card-title fw-bold text-truncate mb-1" title="${phim.TEN_PHIM}">${phim.TEN_PHIM}</h6>
                    <small class="text-muted mb-3 text-truncate d-block">${phim.TEN_THE_LOAI || 'Đang cập nhật'}</small>
                    <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="badge bg-warning text-dark"><i class="bi bi-star-fill"></i> 8.9</span>
                        <button onclick="window.location.href='/chitietphim?id=${phim.MA_PHIM}'" class="btn btn-sm text-white fw-bold px-3 rounded-pill" style="background-color: #a50064;">Đặt vé</button>
                    </div>
                </div>
            </div>
        </div>`;
    });
}

/**
 * --- PHẦN 3: XỬ LÝ MODAL TRAILER YOUTUBE ---
 */
function openTrailerModal(element) {
    const id = element.getAttribute('data-id');
    const title = element.getAttribute('data-title');
    const poster = element.getAttribute('data-poster');
    const desc = element.getAttribute('data-desc');
    let rawUrl = element.getAttribute('data-trailer');

    let embedUrl = "";
    if (rawUrl && rawUrl !== "null" && rawUrl !== "") {
        let videoId = "";
        if (rawUrl.indexOf("v=") !== -1) videoId = rawUrl.split("v=")[1].split("&")[0];
        else if (rawUrl.indexOf("youtu.be/") !== -1) videoId = rawUrl.split("youtu.be/")[1].split("?")[0];
        else if (rawUrl.indexOf("embed/") !== -1) videoId = rawUrl.split("embed/")[1].split("?")[0];

        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    document.getElementById('trailer-title').innerText = title || 'Phim rạp';
    document.getElementById('trailer-desc').innerText = (desc && desc !== 'null') ? desc : 'Đang cập nhật nội dung...';
    if (poster && poster !== 'null') document.getElementById('trailer-poster').src = poster;
    if (id && id !== 'null') document.getElementById('trailer-book-btn').href = `/chitietphim?id=${id}`;

    document.getElementById('trailer-iframe').src = embedUrl !== "" ? embedUrl : "https://www.youtube.com/embed/YoHD9XEInc0?autoplay=1";

    new bootstrap.Modal(document.getElementById('trailerModal')).show();
}

/**
 * --- PHẦN 4: LẮNG NGHE SỰ KIỆN KHI TRANG LOAD XONG ---
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchMoviesForGrid();

    // Hàm lấy tất cả giá trị lọc hiện tại để render lại
    const refreshGrid = () => {
        const search = document.getElementById('movie-search')?.value || '';
        const status = document.querySelector('input[name="btnradio"]:checked')?.value || 'dang-chieu';
        const genre = document.getElementById('genre-filter')?.value || 'all';
        renderMovieGrid(allMoviesList, status, search, genre);
    };

    // Lắng nghe đóng Modal
    const trailerModalEl = document.getElementById('trailerModal');
    if (trailerModalEl) {
        trailerModalEl.addEventListener('hidden.bs.modal', () => {
            document.getElementById('trailer-iframe').src = '';
        });
    }
    // Sự kiện Tìm kiếm
    document.getElementById('movie-search')?.addEventListener('input', refreshGrid);
    // Sự kiện Đang chiếu / Sắp chiếu
    document.querySelectorAll('input[name="btnradio"]').forEach(r => r.addEventListener('change', refreshGrid));
    // SỰ KIỆN THỂ LOẠI (Duy dán đúng đoạn này vào nè)
    document.getElementById('genre-filter')?.addEventListener('change', refreshGrid);
});
