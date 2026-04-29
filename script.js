/* ============================================================
   Khai báo biến toàn cục (Chỉ khai báo 1 lần)
   ============================================================ */
let globalDatabase = {}; 
let supplierExcelData = []; 
let chartExcelData = [];    
let currentImagesList = []; 
let currentImgIndex = 0;    
let zoomScale = 1;

/* ============================================================
   1. XỬ LÝ QUÉT FOLDER VÀ ĐỌC EXCEL
   ============================================================ */
async function scanFolder(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    globalDatabase = {}; 
    let excelInfoFile = null;
    let excelChartFile = null;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = file.webkitRelativePath; 
        const parts = path.split('/');

        if (file.name.includes("Supplier Phu Nghia")) excelInfoFile = file;
        if (file.name.includes("Data bieu do")) excelChartFile = file;

        if (parts.length >= 3) {
            const nccName = parts[1].trim();
            const evalDate = parts[2].trim();
            
            if (!globalDatabase[nccName]) globalDatabase[nccName] = { dates: {} };
            if (!globalDatabase[nccName].dates[evalDate]) globalDatabase[nccName].dates[evalDate] = [];
            
            globalDatabase[nccName].dates[evalDate].push({
                name: file.name,
                url: URL.createObjectURL(file)
            });
        }
    }

    if (excelInfoFile) supplierExcelData = await readExcel(excelInfoFile);
    if (excelChartFile) chartExcelData = await readExcel(excelChartFile);
    
    updateNCCList();
    alert("Hệ thống đã sẵn sàng! Dữ liệu Excel và Folder đã khớp.");
}

function readExcel(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
            
            const normalizedData = json.map(row => {
                let newRow = {};
                for (let key in row) {
                    newRow[key.trim()] = row[key];
                }
                return newRow;
            });
            resolve(normalizedData);
        };
        reader.readAsArrayBuffer(file);
    });
}

function toSlug(str) {
    if (!str) return "";
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, "");
}

/* ============================================================
   2. CẬP NHẬT DANH SÁCH GỢI Ý (UI/UX)
   ============================================================ */
function updateNCCList() {
    const datalist = document.getElementById('ncc-options');
    if (!datalist) return;
    datalist.innerHTML = ''; 

    const nccNames = Object.keys(globalDatabase).sort();
    nccNames.forEach(ncc => {
        const option = document.createElement('option');
        option.value = ncc;
        datalist.appendChild(option);
    });
}

function onNCCSearch() {
    const searchVal = document.getElementById('ncc-search').value;
    if (globalDatabase[searchVal]) {
        updateDates(searchVal);
    }
}

function updateDates(nccName) {
    const dateSelect = document.getElementById('date-select');
    if (!dateSelect) return;
    dateSelect.innerHTML = '<option value="">-- Chọn Ngày --</option>';
    
    if (nccName && globalDatabase[nccName]) {
        Object.keys(globalDatabase[nccName].dates).sort().reverse().forEach(date => {
            const option = document.createElement('option');
            option.value = date; 
            option.text = date;
            dateSelect.appendChild(option);
        });
    }
}

/* ============================================================
   3. HIỂN THỊ DỮ LIỆU TỔNG HỢP
   ============================================================ */
function displayData() {
    const ncc = document.getElementById('ncc-search').value;
    const date = document.getElementById('date-select').value;
    
    if (!ncc || !date) return alert("Vui lòng chọn đúng NCC và Ngày!");

    renderInfo(ncc); 
    renderMedia(ncc, date);
    renderChart(ncc); 
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
    } else {
        container.innerHTML = `<p style="color:orange">⚠️ Không tìm thấy thông tin NCC trong file "Supplier Phu Nghia".</p>`;
    }
}

function renderMedia(ncc, date) {
    const imgContainer = document.getElementById('factory-images');
    const pdfContainer = document.getElementById('pdf-result'); 

    if (imgContainer) imgContainer.innerHTML = '';
    if (pdfContainer) pdfContainer.innerHTML = '';
    currentImagesList = [];

    const files = globalDatabase[ncc]?.dates[date] || [];
    
    files.forEach(file => {
        const fileName = file.name.toLowerCase();

        if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) {
            currentImagesList.push(file.url);
            const index = currentImagesList.length - 1;
            const img = document.createElement('img');
            img.src = file.url;
            img.className = "thumb-img";
            img.onclick = () => openModal(index);
            imgContainer.appendChild(img);
        }

        if (fileName.endsWith('.pdf')) {
            const pdfBox = document.createElement('div');
            pdfBox.className = "pdf-item";
            pdfBox.innerHTML = `
                <a href="${file.url}" target="_blank" style="text-decoration: none; color: inherit;">
                    📄 <span>${file.name}</span>
                </a>
            `;
            if (pdfContainer) pdfContainer.appendChild(pdfBox);
        }
    });

    if (pdfContainer && pdfContainer.innerHTML === '') {
        pdfContainer.innerHTML = '<p style="color: #666; font-style: italic;">Không có hồ sơ đánh giá cho ngày này.</p>';
    }
}

/* ============================================================
   4. XỬ LÝ MODAL (XEM ẢNH PHÓNG TO)
   ============================================================ */
function openModal(index) {
    currentImgIndex = index;
    zoomScale = 1; 
    
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgFull");
    
    if (modal && modalImg) {
        modal.style.display = "flex";
        // Cập nhật ảnh ngay lập tức để tránh màn hình đen
        updateModalImage();
    }
}

function updateModalImage() {
    const modalImg = document.getElementById("imgFull");
    if (modalImg && currentImagesList[currentImgIndex]) {
        modalImg.src = currentImagesList[currentImgIndex];
        modalImg.style.transform = `scale(${zoomScale})`;
    }
}

function changeImage(step) {
    currentImgIndex += step;
    if (currentImgIndex >= currentImagesList.length) currentImgIndex = 0;
    if (currentImgIndex < 0) currentImgIndex = currentImagesList.length - 1;
    zoomScale = 1; 
    updateModalImage(); 
}

function handleZoom(event) {
    event.preventDefault();
    const modalImg = document.getElementById("imgFull");
    if (!modalImg) return;
    const delta = event.deltaY < 0 ? 0.15 : -0.15; 
    zoomScale = Math.min(Math.max(0.5, zoomScale + delta), 5); 
    modalImg.style.transform = `scale(${zoomScale})`;
}

function closeModal() {
    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "none";
}

function moveSlider(direction) {
    const container = document.getElementById('factory-images');
    const scrollAmount = 265; 
    if (container) {
        container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
}

/* ============================================================
   5. XỬ LÝ BIỂU ĐỒ (CHART.JS)
   ============================================================ */
function renderChart(ncc) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.myChart instanceof Chart) {
        window.myChart.destroy();
    }

    const history = chartExcelData.filter(item => {
        const nameInExcel = item["Supplier Name"] ? String(item["Supplier Name"]).trim() : "";
        return toSlug(nameInExcel) === toSlug(ncc) && item["Year"];
    });

    history.sort((a, b) => parseInt(a["Year"]) - parseInt(b["Year"]));
    if (history.length === 0) return;

    const formatValue = (val, isPercent = false) => {
        if (typeof val === 'string') val = val.replace('%', '');
        let num = parseFloat(val) || 0;
        if (isPercent && num <= 1 && num > 0) num = num * 100;
        return Math.round(num);
    };

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: history.map(h => h["Year"]),
            datasets: [
                {
                    label: 'Tần suất tái đánh giá',
                    type: 'line',
                    data: history.map(h => formatValue(h["Likelihood ratio"] || h["Likelihood ration"])),
                    borderColor: '#00f2ff', 
                    backgroundColor: '#00f2ff',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    yAxisID: 'yRight'
                },
                {
                    label: 'PU006 (%)',
                    data: history.map(h => formatValue(h["PU006"], true)),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'ISO (%)',
                    data: history.map(h => formatValue(h["ISO"], true)),
                    backgroundColor: 'rgba(153, 102, 255, 0.7)',
                    borderRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'Social',
                    data: history.map(h => formatValue(h["Social"])),
                    backgroundColor: 'rgba(255, 206, 86, 0.8)',
                    borderRadius: 5,
                    yAxisID: 'yRight'
                },
                {
                    label: 'Red point',
                    data: history.map(h => formatValue(h["Red point"])),
                    backgroundColor: 'rgba(200, 0, 0, 1)',
                    borderRadius: 5,
                    yAxisID: 'yRight'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#1a1a1a',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#1a1a1a', font: { weight: 'bold', size: 12 }, usePointStyle: true }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 125, 
                    position: 'left',
                    ticks: { 
                        color: '#1a1a1a', 
                        font: { weight: 'bold' },
                        callback: function(value) { if (value <= 100) return value + '%'; }
                    }
                },
                yRight: {
                    beginAtZero: true,
                    max: 5, 
                    position: 'right',
                    ticks: { color: '#1a1a1a', font: { weight: 'bold' } },
                    grid: { drawOnChartArea: false }
                },
                x: { ticks: { color: '#1a1a1a', font: { weight: 'bold' } } }
            }
        }
    });
}