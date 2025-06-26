const LOCAL_DEVICE_URL = `http://${CURRENT_DEVICE_HOSTNAME}.local`;
const THINGER_USERNAME = THINGER_USERNAME_DASHBOARD;
const THINGER_DEVICE_ID = CURRENT_THINGER_DEVICE_ID;
const THINGER_API_TOKEN = THINGER_API_TOKEN_DASHBOARD;
const THINGER_BASE_URL = `https://backend.thinger.io/v3/users/${THINGER_USERNAME}/devices/${THINGER_DEVICE_ID}`;

// URL untuk backend MySQL Anda (sesuaikan dengan port Node.js Anda)
const MYSQL_BACKEND_URL = "http://localhost:3000/api/schedules";

// --- ELEMEN UI ---
const elements = {
    suhuValue: document.getElementById("suhu-value"),
    kelembabanValue: document.getElementById("kelembaban-value"),
    relayStatus: document.getElementById("relay-status"),
    autoModeStatus: document.getElementById("auto-mode-status"),
    scheduleModeStatus: document.getElementById("schedule-mode-status"),
    pompaToggle: document.getElementById("pompa-toggle"),
    autoModeToggle: document.getElementById("auto-mode-toggle"),
    scheduleModeToggle: document.getElementById("schedule-mode-toggle"),
    schedulerContainer: document.querySelector('.scheduler-container'),
    scheduleList: document.getElementById("schedule-list"),
    addScheduleForm: document.getElementById("add-schedule-form"),
    refreshButton: document.getElementById("refresh-btn"),
    addScheduleButton: document.querySelector('.add-schedule-btn'),
    startHourInput: document.getElementById("start-hour"),
    startMinuteInput: document.getElementById("start-minute"),
    endHourInput: document.getElementById("end-hour"),
    endMinuteInput: document.getElementById("end-minute"),
    consumptionChart: null // Menambahkan referensi untuk objek Chart.js
};

// --- VARIABEL GLOBAL ---
let currentControlMode = 'manual'; // 'manual', 'auto', 'schedule'
let isLocalConnected = false;
let previousLocalConnectionStatus = false;
const ESP_DEVICE_ID = THINGER_DEVICE_ID; // Gunakan THINGER_DEVICE_ID dari konfigurasi dashboard

// ====================================================================
// === MANAJEMEN DATA & KONEKSI =======================================
// ====================================================================

async function fetchInitialData() {
    showToast("Sinkronisasi dengan cloud...");
    try {
        const headers = { Authorization: `Bearer ${THINGER_API_TOKEN}` };
        const [sensorRes, relayRes, autoModeRes, scheduleModeRes] = await Promise.all([
            axios.get(`${THINGER_BASE_URL}/resources/sensor`, { headers }),
            axios.get(`${THINGER_BASE_URL}/resources/relay`, { headers }),
            axios.get(`${THINGER_BASE_URL}/resources/auto_mode`, { headers }),
            axios.get(`${THINGER_BASE_URL}/resources/schedule_mode`, { headers })
        ]);

        let mode = "manual";
        if (autoModeRes.data === true) mode = "auto";
        else if (scheduleModeRes.data === true) mode = "schedule";

        const combinedData = {
            temperature: sensorRes.data.temperature,
            humidity: sensorRes.data.humidity,
            relay_state: relayRes.data,
            control_mode: mode
        };
        updateUI(combinedData);
        // Memperbarui grafik dengan data awal
        updateChart(combinedData.temperature, combinedData.humidity);
        showToast("Data berhasil disinkronkan.");
    } catch (error) {
        console.error("Error fetching initial data from Thinger.io:", error);
        showToast("Gagal mengambil data dari cloud.", true);
    }
}

async function fetchSensorDataOnly() {
    try {
        const headers = { Authorization: `Bearer ${THINGER_API_TOKEN}` };
        const sensorRes = await axios.get(`${THINGER_BASE_URL}/resources/sensor`, { headers });

        const temperature = sensorRes.data.temperature;
        const humidity = sensorRes.data.humidity;

        if (temperature !== undefined) elements.suhuValue.innerText = temperature.toFixed(1);
        if (humidity !== undefined) elements.kelembabanValue.innerText = humidity.toFixed(0);

        // Memperbarui grafik dengan data sensor terbaru
        updateChart(temperature, humidity);

    } catch (error) {
        console.error("Error fetching sensor data only from Thinger.io:", error);
        showToast("Gagal mengambil data sensor terbaru.", true); // Menambahkan notifikasi toast
    }
}

// Fungsi untuk mengambil jadwal dari backend MySQL (DIPERBARUI)
async function fetchSchedulesFromBackend() {
    showToast("Mencoba memuat jadwal dari database...");
    try {
        // MENGIRIM ESP_DEVICE_ID SEBAGAI PARAMETER QUERY
        // Gunakan ESP_DEVICE_ID yang diambil dari CURRENT_THINGER_DEVICE_ID di HTML
        const response = await axios.get(`${MYSQL_BACKEND_URL}?esp_device_id=${ESP_DEVICE_ID}`, { timeout: 5000 });
        if (response.data.success) {
            showToast("Jadwal dimuat dari database.");
            console.log("DEBUG [script3.js]: Fetched schedules from backend (filtered):", response.data.schedules);
            return response.data.schedules || [];
        } else {
            console.error("Gagal memuat jadwal dari backend MySQL:", response.data.message);
            showToast("Gagal memuat jadwal dari database.", true);
            return [];
        }
    } catch (error) {
        console.error("Error fetching schedules from MySQL backend:", error);
        showToast("Tidak dapat terhubung ke database jadwal.", true);
        return [];
    }
}

async function checkLocalConnectionAndSchedules() {
    let schedulesToRender = [];
    let scheduleSource = "local";

    try {
        const localResponse = await axios.get(`${LOCAL_DEVICE_URL}/status`, { timeout: 3000 });
        isLocalConnected = true;
        schedulesToRender = localResponse.data.schedules || [];
        console.log("DEBUG [script3.js]: Fetched schedules from LOCAL device:", schedulesToRender);

        if (!previousLocalConnectionStatus && isLocalConnected) {
            showToast("Terhubung ke perangkat lokal.");
        }
    } catch (error) {
        isLocalConnected = false;
        scheduleSource = "mysql";

        if (previousLocalConnectionStatus && !isLocalConnected) {
            console.warn("Tidak dapat terhubung ke perangkat lokal. Mencoba memuat jadwal dari database...");
            showToast("Tidak dapat terhubung ke perangkat lokal. Memuat jadwal dari database.", true);
        } else if (!previousLocalConnectionStatus && !isLocalConnected) {
            console.warn("Masih tidak dapat terhubung ke perangkat lokal. Mode Jadwal terbatas.");
        }

        schedulesToRender = await fetchSchedulesFromBackend();
    } finally {
        previousLocalConnectionStatus = isLocalConnected;

        elements.schedulerContainer.style.display = 'block';
        renderSchedules(schedulesToRender, isLocalConnected);
    }
}

// ====================================================================
// === PEMBARUAN ANTARMuka (UI) =======================================
// ====================================================================

function updateUI(data) {
    if (data.temperature !== undefined) elements.suhuValue.innerText = data.temperature.toFixed(1);
    if (data.humidity !== undefined) elements.kelembabanValue.innerText = data.humidity.toFixed(0);
    if (data.relay_state !== undefined) {
        elements.relayStatus.innerText = `Status: ${data.relay_state ? "ON" : "OFF"}`;
        elements.pompaToggle.checked = data.relay_state;
    }
    if (data.control_mode !== undefined) {
        currentControlMode = data.control_mode;
        const isAuto = currentControlMode === 'auto';
        const isSchedule = currentControlMode === 'schedule';
        const isManual = !isAuto && !isSchedule;

        elements.autoModeToggle.checked = isAuto;
        elements.scheduleModeToggle.checked = isSchedule;

        elements.autoModeStatus.innerText = `Status: ${isAuto ? "Aktif" : "Nonaktif"}`;
        elements.scheduleModeStatus.innerText = `Mode Jadwal ${isSchedule ? "(Aktif)" : ""}`;

        elements.pompaToggle.disabled = !isManual;

        elements.autoModeToggle.disabled = isSchedule;
        elements.scheduleModeToggle.disabled = isAuto;
    }
}

// Menampilkan modal konfirmasi kustom sebagai pengganti alert/confirm
function customConfirm(message, onConfirm, onCancel) {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; justify-content: center;
      align-items: center; z-index: 9999;
    `;
    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: white; padding: 25px; border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2); text-align: center; max-width: 400px;
      color: var(--text-color);
    `;
    modalContent.innerHTML = `
      <p style="margin-bottom: 20px; font-size: 16px;">${message.replace(
        /\n/g,
        "<br>"
      )}</p>
      <button id="confirm-ok" style="background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Lanjutkan</button>
      <button id="confirm-cancel" style="background: #ccc; color: black; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Batal</button>
    `;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    document.getElementById("confirm-ok").onclick = () => {
      document.body.removeChild(modal);
      onConfirm();
    };
    document.getElementById("confirm-cancel").onclick = () => {
      document.body.removeChild(modal);
      onCancel();
    };
}


function renderSchedules(schedules, localConnectionStatus) {
    elements.scheduleList.innerHTML = "";

    elements.addScheduleButton.disabled = !localConnectionStatus;
    elements.addScheduleButton.classList.toggle('disabled-button', !localConnectionStatus);
    elements.startHourInput.disabled = !localConnectionStatus;
    elements.startMinuteInput.disabled = !localConnectionStatus;
    elements.endHourInput.disabled = !localConnectionStatus;
    elements.endMinuteInput.disabled = !localConnectionStatus;

    if (schedules.length === 0) {
        elements.scheduleList.innerHTML = `<li class="text-gray-500">${localConnectionStatus ? "Tidak ada jadwal yang diatur." : "Tidak ada koneksi lokal. Jadwal tidak tersedia untuk pengeditan. Data diambil dari database."}</li>`;
        return;
    }

    schedules.sort((a, b) => {
        const timeA = a.start_hour * 60 + a.start_minute;
        const timeB = b.start_hour * 60 + b.start_minute;
        return timeA - timeB;
    });

    schedules.forEach(schedule => {
        console.log("DEBUG [script3.js]: Rendering individual schedule:", schedule);
        console.log("DEBUG [script3.js]: schedule.schedule_id for rendering:", schedule.schedule_id);

        const listItem = document.createElement("li");
        const startTime = `${String(schedule.start_hour).padStart(2, '0')}:${String(schedule.start_minute).padStart(2, '0')}`;
        const endTime = `${String(schedule.end_hour).padStart(2, '0')}:${String(schedule.end_minute).padStart(2, '0')}`;

        listItem.innerHTML = `
            <span>${startTime} - ${endTime}</span>
            <button class="delete-schedule-btn" data-esp-schedule-id="${schedule.schedule_id}" ${!localConnectionStatus ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        const deleteButton = listItem.querySelector('.delete-schedule-btn');
        if (localConnectionStatus) {
            deleteButton.addEventListener('click', () => {
                // Panggil konfirmasi sebelum menghapus
                customConfirm(
                    `Apakah Anda yakin ingin menghapus jadwal ini?\n\n${startTime} - ${endTime}`,
                    () => {
                        // Jika pengguna mengkonfirmasi
                        showToast(`Menghapus jadwal ${startTime} - ${endTime}...`);
                        const espScheduleId = deleteButton.getAttribute('data-esp-schedule-id');
                        console.log("DEBUG [script3.js]: Value retrieved from data-attribute on click:", espScheduleId);
                        deleteSchedule(espScheduleId);
                    },
                    () => {
                        // Jika pengguna membatalkan
                        showToast("Penghapusan jadwal dibatalkan.", true);
                    }
                );
            });
        }
        elements.scheduleList.appendChild(listItem);
    });
}

// ====================================================================
// === KONTROL PERANGKAT & JADWAL =====================================
// ====================================================================

async function sendCommand(resource, value) {
    try {
        await axios.post(`${THINGER_BASE_URL}/resources/${resource}`, value, {
            headers: { Authorization: `Bearer ${THINGER_API_TOKEN}`, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(`Gagal mengirim perintah ke ${resource}:`, error);
        showToast(`Gagal mengirim perintah ke ${resource}.`, true);
    }
}

async function addSchedule(event) {
    event.preventDefault();

    if (!isLocalConnected) {
        showToast("Tidak dapat menambah jadwal. Tidak ada koneksi ke perangkat lokal.", true);
        return;
    }

    const startHour = elements.startHourInput.value;
    const startMinute = elements.startMinuteInput.value;
    const endHour = elements.endHourInput.value;
    const endMinute = elements.endMinuteInput.value;

    if (!startHour || !startMinute || !endHour || !endMinute) { showToast("Harap isi semua kolom waktu.", true); return; }

    const scheduleId = Date.now();
    console.log("DEBUG [script3.js]: Generated new scheduleId for adding:", scheduleId);

    try {
        await axios.post(`${LOCAL_DEVICE_URL}/schedules`, {
            id: Number(scheduleId),
            start_hour: parseInt(startHour),
            start_minute: parseInt(startMinute),
            end_hour: parseInt(endHour),
            end_minute: parseInt(endMinute),
        });
        showToast("Jadwal berhasil ditambahkan ke perangkat lokal!");

        await axios.post(MYSQL_BACKEND_URL, {
            esp_device_id: ESP_DEVICE_ID,
            schedule_id: Number(scheduleId),
            start_hour: parseInt(startHour),
            start_minute: parseInt(startMinute),
            end_hour: parseInt(endHour),
            end_minute: parseInt(endMinute),
        });
        showToast("Jadwal berhasil disimpan ke database!");

        checkLocalConnectionAndSchedules();
        elements.addScheduleForm.reset();
    } catch (error) {
        console.error("Gagal menambah jadwal:", error);
        showToast("Gagal menambah jadwal. Pastikan terhubung lokal dan server berjalan.", true);
    }
}

async function deleteSchedule(espScheduleId) {
    console.log("DEBUG [script3.js]: deleteSchedule called with espScheduleId:", espScheduleId, "Type:", typeof espScheduleId);

    try {
        let espDeleteSuccess = false;
        if (isLocalConnected) {
            try {
                await axios.post(`${LOCAL_DEVICE_URL}/schedules/delete`, { id: Number(espScheduleId) });
                showToast("Jadwal berhasil dihapus dari perangkat lokal!");
                espDeleteSuccess = true;
            } catch (espError) {
                console.error("Gagal menghapus jadwal dari perangkat lokal:", espError);
                if (espError.response) {
                    console.error("Detail respons ESP32:", espError.response.data);
                    console.error("Status respons ESP32:", espError.response.status);
                } else {
                    console.error("Pesan error ESP32:", espError.message);
                }
                showToast("Gagal menghapus jadwal dari perangkat lokal. Periksa koneksi atau respons ESP32.", true);
            }
        } else {
            console.warn("Tidak terhubung ke perangkat lokal. Melewati penghapusan dari ESP32.");
            showToast("Tidak terhubung ke perangkat lokal. Hanya menghapus dari database.", true);
        }

        await axios.post(`${MYSQL_BACKEND_URL}/delete`, {
            esp_device_id: ESP_DEVICE_ID,
            schedule_id: Number(espScheduleId)
        });
        showToast("Jadwal berhasil dihapus");

        checkLocalConnectionAndSchedules();
    } catch (error) {
        console.error("Gagal menghapus jadwal:", error);
        showToast("Gagal menghapus jadwal. Pastikan server berjalan.", true);
    }
}

// ====================================================================
// === UTILITAS & INISIALISASI ========================================
// ====================================================================

function showToast(message, isWarning = false) {
    const toastContainer = document.querySelector('.toast-container') || document.createElement('div');
    if (!document.querySelector('.toast-container')) {
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    while (toastContainer.firstChild) {
        toastContainer.removeChild(toastContainer.firstChild);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${isWarning ? 'warning' : ''}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
            if (!toastContainer.hasChildNodes() && toastContainer.parentElement) {
                toastContainer.parentElement.removeChild(toastContainer);
            }
        }, 500);
    }, 3000);
}

// Fungsi untuk menginisialisasi grafik
function initializeChart() {
    const ctx = document.getElementById("consumption-chart").getContext("2d");
    elements.consumptionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [], // Waktu (label sumbu X)
            datasets: [
                {
                    label: "Suhu (°C)",
                    data: [], // Data suhu
                    borderColor: "rgba(0, 191, 165, 1)",
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false // Tidak mengisi area di bawah garis
                },
                {
                    label: "Kelembaban (%)",
                    data: [], // Data kelembaban
                    borderColor: "rgba(255, 112, 67, 1)",
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false // Tidak mengisi area di bawah garis
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time', // Menggunakan skala waktu
                    time: {
                        unit: 'second', // Unit waktu per detik
                        displayFormats: {
                            second: 'HH:mm:ss' // Format tampilan waktu
                        }
                    },
                    title: {
                        display: true,
                        text: 'Waktu'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Nilai'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Fungsi untuk memperbarui grafik dengan data baru
function updateChart(temperature, humidity) {
    const chart = elements.consumptionChart;
    const now = new Date(); // Waktu saat ini

    // Tambahkan data baru ke dataset
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(temperature);
    chart.data.datasets[1].data.push(humidity);

    // Batasi jumlah data yang ditampilkan (misalnya, 20 data terakhir)
    const maxDataPoints = 20;
    if (chart.data.labels.length > maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
    }

    // Perbarui grafik
    chart.update();
}


function setControlMode(newMode) {
    if (currentControlMode === newMode) {
        return;
    }

    const oldMode = currentControlMode;
    currentControlMode = newMode;

    if (newMode === 'auto') {
        sendCommand('auto_mode', true);
        sendCommand('schedule_mode', false);
        showToast('Mode Otomatis diaktifkan.');
    } else if (newMode === 'schedule') {
        sendCommand('schedule_mode', true);
        sendCommand('auto_mode', false);
        showToast('Mode Jadwal diaktifkan.');
    } else {
        if (oldMode === 'auto') {
            sendCommand('auto_mode', false);
            if (elements.pompaToggle.checked) {
                sendCommand('relay', false);
                elements.relayStatus.innerText = "Status: OFF";
                elements.pompaToggle.checked = false;
            }
            showToast('Mode Otomatis dinonaktifkan. Kembali ke mode manual.');
        } else if (oldMode === 'schedule') {
            sendCommand('schedule_mode', false);
            showToast('Mode Jadwal dinonaktifkan. Kembali ke mode manual.');
        }
    }

    updateUI({ control_mode: currentControlMode, relay_state: elements.pompaToggle.checked });
}

// INISIALISASI APLIKASI
window.addEventListener('DOMContentLoaded', () => {
    if (elements.refreshButton) {
        elements.refreshButton.addEventListener('click', fetchInitialData);
    }

    elements.pompaToggle.addEventListener('click', (e) => {
        if (currentControlMode !== 'manual') {
            e.preventDefault();
            showToast(`Nonaktifkan Mode ${currentControlMode.toUpperCase()} terlebih dahulu.`, true);
            return;
        }
        const isOn = e.target.checked;
        elements.relayStatus.innerText = `Status: ${isOn ? "ON" : "OFF"}`;
        showToast(`Perintah Pompa ${isOn ? 'ON' : 'OFF'} terkirim.`);
        sendCommand('relay', isOn);
    });

    elements.autoModeToggle.addEventListener('click', (e) => {
        const isEnabling = e.target.checked;
        if (isEnabling) {
            if (currentControlMode === 'schedule') {
                e.target.checked = false;
                showToast(`Nonaktifkan Mode JADWAL terlebih dahulu untuk mengaktifkan Otomatis.`, true);
                return;
            }
            setControlMode('auto');
        } else {
            setControlMode('manual');
        }
    });

    elements.scheduleModeToggle.addEventListener('click', (e) => {
        const isEnabling = e.target.checked;
        if (isEnabling) {
            if (currentControlMode === 'auto') {
                e.target.checked = false;
                showToast(`Nonaktifkan Mode OTOMATIS terlebih dahulu untuk mengaktifkan Jadwal.`, true);
                return;
            }
            setControlMode('schedule');
        } else {
            setControlMode('manual');
        }
    });

    elements.addScheduleForm.addEventListener('submit', addSchedule);

    initializeChart(); // Inisialisasi Chart.js
    fetchInitialData();
    setInterval(fetchSensorDataOnly, 5000); // Mengambil data sensor dan memperbarui grafik setiap 5 detik

    checkLocalConnectionAndSchedules();
    setInterval(checkLocalConnectionAndSchedules, 10000);
});
