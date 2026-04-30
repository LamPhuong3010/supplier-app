/* ============================================================
   1. CẤU HÌNH HỆ THỐNG
   ============================================================ */
const GITHUB_USER = "LamPhuong3010";
const GITHUB_REPO = "supplier-app";
const BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/data/`;

let globalDatabase = {}; 
let supplierExcelData = []; 
let chartExcelData = [];    
let currentImagesList = []; 
let currentImgIndex = 0;

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
            // Lấy danh sách ngày/tháng/năm từ cột "Year" trong file biểu đồ
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
   3. XỬ LÝ GIAO DIỆN
   ============================================================ */
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

// Đăng ký plugin hiển thị nhãn
Chart.register(ChartDataLabels);
function renderChart(ncc) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.myChart instanceof Chart) window.myChart.destroy();

    const history = chartExcelData.filter(item => String(item["Supplier Name"]).trim() === ncc);

    window.myChart = new Chart(ctx, {
        data: {
            labels: history.map(h => String(h["Year"] || "").trim().substring(0, 4)),
            datasets: [
                {
                    type: 'bar',
                    label: 'PU006 (%)',
                    data: history.map(h => h["PU006"]),
                    backgroundColor: '#00bfff', // Xanh đậm rõ ràng
                    datalabels: {
                        anchor: 'end', align: 'top', offset: 5,
                        formatter: v => (v * 100).toFixed(0) + '%',
                        color: '#00bfff', font: { weight: 'bold', size: 12 }
                    }
                },
                {
                    type: 'bar',
                    label: 'ISO (%)',
                    data: history.map(h => h["ISO"]),
                    backgroundColor: '#3cb371', // Xanh lá đậm
                    datalabels: {
                        anchor: 'end', align: 'top', offset: 5,
                        formatter: v => (v * 100).toFixed(0) + '%',
                        color: '#3cb371', font: { weight: 'bold', size: 12 }
                    }
                },
                {
                    type: 'line',
                    label: 'Social',
                    data: history.map(h => h["Social"]),
                    borderColor: '#ffa500',
                    backgroundColor: 'rgba(255, 165, 0, 0.1)', // Vùng màu cam mờ
                    fill: true, // Vẽ kiểu Area cho dễ nhìn
                    tension: 0.4,
                    yAxisID: 'ySocial',
                    datalabels: {
                        align: 'right', offset: 10,
                        color: '#ffa500', font: { weight: 'bold' }
                    }
                },
                {
                    type: 'line',
                    label: 'Tần suất',
                    data: history.map(h => h["Likelihood ration"]),
                    borderColor: '#ff4500',
                    borderDash: [5, 5],
                    yAxisID: 'y1',
                    datalabels: {
                        align: 'top', color: '#ff4500',
                        formatter: v => v + ' năm'
                    }
                },
                {
                    type: 'line',
                    label: 'Red Point',
                    data: history.map(h => h["Red point"]),
                    pointBackgroundColor: '#ff0000',
                    pointStyle: 'rectRot',
                    pointRadius: 15,
                    showLine: false,
                    yAxisID: 'y1',
                    datalabels: {
                        color: '#fff', font: { weight: 'bold' },
                        align: 'center'
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 40, bottom: 20 } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1.3, // Để trống chỗ trên đầu cho con số hiện lên
                    ticks: { callback: v => (v * 100).toFixed(0) + '%', color: '#666' }
                },
                ySocial: { display: false, max: 120 }, // Trục ẩn cho Social
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    ticks: { color: '#ff4500' },
                    grid: { drawOnChartArea: false }
                },
                x: { ticks: { color: '#333', font: { weight: 'bold' } } }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#333', // Đổi sang màu tối để nhìn rõ chú thích
                        font: { size: 14, weight: 'bold' },
                        usePointStyle: true,
                        padding: 25
                    }
                },
                datalabels: {
                    display: true,
                    clip: false // Không để mất số khi chạm rìa
                }
            }
        }
    });
}

async function renderMedia(ncc, date) {
    const imgContainer = document.getElementById('factory-images');
    const pdfContainer = document.getElementById('pdf-result');
    imgContainer.innerHTML = 'Đang tải...';
    pdfContainer.innerHTML = '';

    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/${encodeURIComponent(ncc)}/${encodeURIComponent(date)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Folder trống");
        
        const files = await response.json();
        imgContainer.innerHTML = '';

        files.forEach(file => {
            const fileName = file.name.toLowerCase();
            const fileUrl = file.download_url;

            if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
                const img = document.createElement('img');
                img.src = fileUrl;
                img.style = "max-height:150px; margin:5px; border-radius:5px; cursor:zoom-in; border:1px solid #444;";
                // Thay đổi: Mở to tại chỗ thay vì mở tab mới
                img.onclick = () => openModal(fileUrl);
                imgContainer.appendChild(img);
            } 
            else if (fileName.endsWith('.pdf')) {
                // Thay đổi: Mở tab mới để xem trước
                pdfContainer.innerHTML += `
                    <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" 
                       style="display:inline-block; margin:5px; padding:12px 20px; background:#0056b3; color:#fff; border-radius:5px; text-decoration:none; font-weight:bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        📄 Mở Báo Cáo PDF (Tab mới)
                    </a>`;
            }
        });
    } catch (error) {
        imgContainer.innerHTML = '<p style="color:gray;">Không có dữ liệu media cho đợt này.</p>';
    }
}

/* ============================================================
   5. XỬ LÝ MODAL ẢNH (PHÓNG TO)
   ============================================================ */
function openModal(src) {
    document.getElementById('imageModal').style.display = "block";
    document.getElementById('imgFull').src = src;
}

function closeModal() {
    document.getElementById('imageModal').style.display = "none";
}

function moveSlider(direction) {
    const container = document.getElementById('imageModal');
    container.scrollLeft += direction * 200;
}