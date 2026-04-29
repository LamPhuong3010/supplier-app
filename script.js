/* ============================================================
   1. CẤU HÌNH THÔNG TIN GITHUB
   ============================================================ */
const GITHUB_USER = "LamPhuong3010";
const GITHUB_REPO = "supplier-app";
const BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/data/`;

let globalDatabase = {}; 
let supplierExcelData = []; 
let chartExcelData = [];    
let currentImagesList = []; 
let currentImgIndex = 0;
let zoomScale = 1;

// Tự động chạy khi web tải xong
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Đang khởi tạo dữ liệu từ GitHub...");
    await loadInitialData();
});

/* ============================================================
   2. TẢI VÀ ĐỌC DỮ LIỆU EXCEL
   ============================================================ */
async function loadInitialData() {
    try {
        const infoUrl = BASE_URL + "Supplier%20Phu%20Nghia.xlsx";
        const chartUrl = BASE_URL + "Data%20bieu%20do.xlsx";
        
        supplierExcelData = await readExcelFromUrl(infoUrl);
        chartExcelData = await readExcelFromUrl(chartUrl);

        initDatabase();
        console.log("Hệ thống đã sẵn sàng!");
    } catch (error) {
        console.error("Lỗi khởi tạo dữ liệu:", error);
        document.getElementById('supplier-info').innerHTML = "Lỗi: Không thể tải file Excel từ GitHub.";
    }
}

async function readExcelFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Không tìm thấy file: " + url);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function initDatabase() {
    const datalist = document.getElementById('ncc-options');
    if (!datalist) return;
    datalist.innerHTML = '';

    supplierExcelData.forEach(item => {
        const name = String(item["Supplier name"] || "").trim();
        if (name) {
            // Lấy danh sách ngày/năm từ file biểu đồ để link vào mục Chọn Ngày
            const dates = chartExcelData
                .filter(row => String(row["Supplier Name"]).trim() === name)
                .map(row => String(row["Year"]).trim())
                .filter((v, i, a) => v && a.indexOf(v) === i);

            globalDatabase[name] = { dates: dates };
            
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        }
    });
}

/* ============================================================
   3. XỬ LÝ SỰ KIỆN GIAO DIỆN
   ============================================================ */
function toSlug(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
}

function onNCCSearch() {
    const searchVal = document.getElementById('ncc-search').value;
    const dateSelect = document.getElementById('date-select');
    dateSelect.innerHTML = '<option value="">-- Chọn Ngày --</option>';

    if (globalDatabase[searchVal]) {
        globalDatabase[searchVal].dates.forEach(date => {
            const opt = document.createElement('option');
            opt.value = date;
            opt.text = date;
            dateSelect.appendChild(opt);
        });
    }
}

function displayData() {
    const ncc = document.getElementById('ncc-search').value;
    const date = document.getElementById('date-select').value;
    
    if (!ncc) return alert("Vui lòng chọn Nhà cung cấp!");
    
    renderInfo(ncc);   
    renderChart(ncc);  
    renderMedia(ncc, date); 
}

/* ============================================================
   4. HIỂN THỊ CHI TIẾT (INFO, CHART, MEDIA)
   ============================================================ */
function renderInfo(ncc) {
    const container = document.getElementById('supplier-info');
    const row = supplierExcelData.find(item => String(item["Supplier name"]).trim() === ncc);
    
    if (row) {
        const fields = [
            { label: "Vendor Code", key: "Vendor code" },
            { label: "Nhóm Sản Phẩm", key: "Product group" },
            { label: "PIC", key: "PIC" },
            { label: "Phone", key: "Phone" },
            { label: "Email", key: "Email" },
            { label: "Address", key: "Address", fullWidth: true }
        ];
        let html = '<div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
        fields.forEach(f => {
            html += `<div class="info-item" style="${f.fullWidth ? 'grid-column: span 2;' : ''}">
                <b style="color: #00f2ff;">${f.label}:</b> <span>${row[f.key] || '---'}</span>
            </div>`;
        });
        container.innerHTML = html + '</div>';
    }
}

function renderChart(ncc) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.myChart instanceof Chart) { window.myChart.destroy(); }

    const history = chartExcelData.filter(item => String(item["Supplier Name"]).trim() === ncc);
    if (history.length === 0) return;

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: history.map(h => h["Year"]),
            datasets: [
                {
                    label: 'PU006 (%)',
                    data: history.map(h => parseFloat(h["PU006"]) || 0),
                    backgroundColor: 'rgba(0, 242, 255, 0.6)',
                    yAxisID: 'y'
                },
                {
                    label: 'Tần suất',
                    type: 'line',
                    data: history.map(h => parseFloat(h["Likelihood ratio"]) || 0),
                    borderColor: '#ff4d4d',
                    yAxisID: 'yRight'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, position: 'left' },
                yRight: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

async function renderMedia(ncc, date) {
    const imgContainer = document.getElementById('factory-images');
    const pdfContainer = document.getElementById('pdf-result');
    imgContainer.innerHTML = '';
    pdfContainer.innerHTML = '';
    currentImagesList = [];

    if (!date) {
        imgContainer.innerHTML = '<p style="color:gray;">Vui lòng chọn Ngày để xem ảnh.</p>';
        return;
    }

    const photoUrl = `${BASE_URL}${encodeURIComponent(ncc)}/${encodeURIComponent(date)}/Factory%20image.png`;
    const pdfUrl = `${BASE_URL}${encodeURIComponent(ncc)}/${encodeURIComponent(date)}/Evaluation_Report.pdf`;

    // Thử tải ảnh
    try {
        const resImg = await fetch(photoUrl);
        if (resImg.ok) {
            currentImagesList.push(photoUrl);
            imgContainer.innerHTML = `<img src="${photoUrl}" class="thumb-img" onclick="openModal(0)" style="max-height:200px; border-radius:8px; cursor:pointer;">`;
        } else {
            imgContainer.innerHTML = '<p style="color:gray;">Không có Factory image.png</p>';
        }
    } catch (e) { console.error("Lỗi load ảnh"); }

    // Thử tải PDF
    try {
        const resPdf = await fetch(pdfUrl);
        if (resPdf.ok) {
            pdfContainer.innerHTML = `<a href="${pdfUrl}" target="_blank" style="color:#00f2ff; text-decoration:none;">📄 Xem báo cáo đánh giá (${date})</a>`;
        } else {
            pdfContainer.innerHTML = '<p style="color:gray;">Không có file PDF.</p>';
        }
    } catch (e) { }
}

/* ============================================================
   5. XỬ LÝ MODAL ẢNH (ZOOM & NAVIGATION)
   ============================================================ */
function openModal(index) {
    currentImgIndex = index;
    zoomScale = 1;
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgFull");
    if (modal && modalImg) {
        modal.style.display = "flex";
        modalImg.src = currentImagesList[currentImgIndex];
        modalImg.style.transform = `scale(${zoomScale})`;
    }
}

function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}

function changeImage(step) {
    currentImgIndex += step;
    if (currentImgIndex >= currentImagesList.length) currentImgIndex = 0;
    if (currentImgIndex < 0) currentImgIndex = currentImagesList.length - 1;
    document.getElementById("imgFull").src = currentImagesList[currentImgIndex];
}

function handleZoom(e) {
    e.preventDefault();
    zoomScale += e.deltaY * -0.001;
    zoomScale = Math.min(Math.max(.5, zoomScale), 3);
    document.getElementById("imgFull").style.transform = `scale(${zoomScale})`;
}

// Hàm hỗ trợ slider di chuyển ngang
function moveSlider(direction) {
    const container = document.getElementById('factory-images');
    container.scrollLeft += direction * 200;
}