/* ============================================================
   Khai báo biến toàn cục
   ============================================================ */
let globalDatabase = {}; 
let supplierExcelData = []; 
let chartExcelData = [];    
let currentImagesList = []; 
let currentImgIndex = 0;    
let zoomScale = 1;

// Cấu hình đường dẫn GitHub của bạn
const GITHUB_USER = "LamPhuong3010";
const GITHUB_REPO = "supplier-app";
const BASE_URL = `https://raw.githubusercontent/${GITHUB_USER}/${GITHUB_REPO}/main/data/`;

/* ============================================================
   1. TỰ ĐỘNG TẢI DỮ LIỆU KHI TRANG WEB MỞ (INIT)
   ============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Đang khởi tạo dữ liệu từ GitHub...");
    await loadInitialData();
});

async function loadInitialData() {
    try {
        // 1. Tải file Excel thông tin nhà cung cấp
        const infoUrl = BASE_URL + "Supplier%20Phu%20Nghia.xlsx"; // Lưu ý: %20 thay cho dấu cách
        supplierExcelData = await readExcelFromUrl(infoUrl);

        // 2. Tải file Excel biểu đồ
        const chartUrl = BASE_URL + "Data%20bieu%20do.xlsx";
        chartExcelData = await readExcelFromUrl(chartUrl);

        // 3. Khởi tạo danh sách NCC từ file Excel
        initDatabaseFromExcel();
        
        console.log("Hệ thống đã sẵn sàng!");
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
    }
}

// Hàm đọc file Excel từ một URL (GitHub)
async function readExcelFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Không thể tải file: " + url);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
    
    return json.map(row => {
        let newRow = {};
        for (let key in row) { newRow[key.trim()] = row[key]; }
        return newRow;
    });
}

function initDatabaseFromExcel() {
    // Tạo danh sách gợi ý NCC từ dữ liệu Excel đã tải
    supplierExcelData.forEach(item => {
        const name = item["Supplier name"];
        if (name && !globalDatabase[name]) {
            globalDatabase[name] = { dates: {} };
        }
    });
    updateNCCList();
}

/* ============================================================
   2. XỬ LÝ MEDIA (ẢNH & PDF) TỪ GITHUB
   ============================================================ */
// Vì GitHub không cho phép liệt kê file trong folder, 
// bạn nên đặt tên ảnh/pdf theo quy tắc: data/Tên NCC/Ngày/tên_file.jpg
function getMediaUrl(ncc, date, fileName) {
    return `${BASE_URL}${encodeURIComponent(ncc)}/${encodeURIComponent(date)}/${encodeURIComponent(fileName)}`;
}

async function renderMedia(ncc, date) {
    const imgContainer = document.getElementById('factory-images');
    const pdfContainer = document.getElementById('pdf-result'); 

    if (imgContainer) imgContainer.innerHTML = 'Đang tải media...';
    if (pdfContainer) pdfContainer.innerHTML = '';
    currentImagesList = [];

    // LƯU Ý: Vì JS không tự quét được folder trên GitHub, 
    // tạm thời chúng ta mặc định file ảnh là "Factory image.png" và logo là "C.P_logo.png"
    // dựa trên những gì bạn đã upload lên image_c36a3b.png
    const filesToTry = [
        { name: "Factory image.png", type: "img" },
        { name: "C.P_logo.png", type: "img" },
        { name: "Evaluation_Report.pdf", type: "pdf" } // Bạn có thể thêm tên file vào đây
    ];

    imgContainer.innerHTML = '';

    for (const file of filesToTry) {
        const url = getMediaUrl(ncc, date, file.name);
        
        // Kiểm tra xem file có tồn tại không trước khi hiển thị
        try {
            const check = await fetch(url, { method: 'HEAD' });
            if (check.ok) {
                if (file.type === "img") {
                    currentImagesList.push(url);
                    const index = currentImagesList.length - 1;
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = "thumb-img";
                    img.onclick = () => openModal(index);
                    imgContainer.appendChild(img);
                } else {
                    const pdfBox = document.createElement('div');
                    pdfBox.className = "pdf-item";
                    pdfBox.innerHTML = `<a href="${url}" target="_blank">📄 <span>${file.name}</span></a>`;
                    pdfContainer.appendChild(pdfBox);
                }
            }
        } catch (e) { /* File không tồn tại, bỏ qua */ }
    }
}

/* ============================================================
   3. CÁC HÀM UI & BIỂU ĐỒ (GIỮ NGUYÊN LOGIC CỦA BẠN)
   ============================================================ */
function toSlug(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
}

function updateNCCList() {
    const datalist = document.getElementById('ncc-options');
    if (!datalist) return;
    datalist.innerHTML = ''; 
    Object.keys(globalDatabase).sort().forEach(ncc => {
        const option = document.createElement('option');
        option.value = ncc;
        datalist.appendChild(option);
    });
}

function onNCCSearch() {
    const searchVal = document.getElementById('ncc-search').value;
    if (globalDatabase[searchVal]) {
        // Mặc định cho phép chọn các ngày đánh giá (Bạn có thể thêm logic lấy ngày từ Excel)
        const mockDates = ["2024-01-01", "2023-12-15"]; 
        const dateSelect = document.getElementById('date-select');
        dateSelect.innerHTML = '<option value="">-- Chọn Ngày --</option>';
        mockDates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d; opt.text = d;
            dateSelect.appendChild(opt);
        });
    }
}

function displayData() {
    const ncc = document.getElementById('ncc-search').value;
    const date = document.getElementById('date-select').value;
    if (!ncc) return alert("Vui lòng chọn NCC!");

    renderInfo(ncc); 
    renderChart(ncc);
    if (date) renderMedia(ncc, date);
}

function renderInfo(ncc) {
    const container = document.getElementById('supplier-info');
    const row = supplierExcelData.find(item => toSlug(item["Supplier name"]) === toSlug(ncc));
    if (row) {
        const fields = [
            { label: "Vendor Code", key: "Vendor code" },
            { label: "Nhóm Sản Phẩm", key: "Product group" },
            { label: "PIC", key: "PIC" },
            { label: "Phone", key: "Phone" },
            { label: "Email", key: "Email" },
            { label: "Address", key: "Address", fullWidth: true }
        ];
        let html = '<div class="info-grid">';
        fields.forEach(f => {
            html += `<div class="info-item ${f.fullWidth ? 'full-width' : ''}">
                <span class="info-label">${f.label}</span>
                <span class="info-value">${row[f.key] || '---'}</span>
            </div>`;
        });
        container.innerHTML = html + '</div>';
    }
}

// --- GIỮ NGUYÊN CÁC HÀM: openModal, changeImage, renderChart TỪ CODE CŨ CỦA BẠN ---
// (Copy lại toàn bộ phần Modal và Chart.js của bạn vào đây)