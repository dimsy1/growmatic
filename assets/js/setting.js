// ====================================================================
// SETTING.JS - GROW MATIC
// ====================================================================

// Alamat dasar perangkat ESP32 yang DIBEBANKAN untuk melakukan pemindaian WiFi.
// Ini akan selalu grow-matic-1, tidak peduli halaman setting mana yang diakses.
const SCAN_DEVICE_HOSTNAME = "grow-matic-3"; // Hostname ESP32 yang bertanggung jawab untuk scan
const SCAN_DEVICE_URL = `http://${SCAN_DEVICE_HOSTNAME}.local`;

// Elemen-elemen DOM
const scanBtn = document.getElementById("scan-wifi-btn");
const scanResultsContainer = document.getElementById("scan-results-container");
const ssidSelect = document.getElementById("wifi-ssid-select");
const passwordInput = document.getElementById("wifi-password");
const wifiForm = document.getElementById("wifiForm");
const togglePasswordBtn = document.getElementById("toggle-password"); // Tombol toggle password
const submitWifiBtn = document.getElementById("submit-wifi-btn"); // !!! BARU: Referensi tombol submit WiFi !!!

/**
 * Menampilkan pesan notifikasi (toast)
 * @param {string} message - Pesan yang akan ditampilkan
 * @param {boolean} isError - True jika ini pesan error
 */
function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  if (isError) {
    toast.style.backgroundColor = "#e74c3c";
  } else {
    toast.style.backgroundColor = "#2ecc71";
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 500);
  }, 4000);
}

/**
 * Memindai jaringan WiFi yang tersedia dengan menghubungi ESP32 yang DIBEBANKAN (grow-matic-1).
 * Pengguna HARUS terhubung ke jaringan WiFi yang sama dengan grow-matic-1 agar ini berfungsi.
 */
async function scanWifi() {
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memindai...';

  try {
    // Permintaan scan SELALU dikirim ke SCAN_DEVICE_URL (grow-matic-1.local)
    const response = await axios.get(`${SCAN_DEVICE_URL}/scan-wifi`, {
      timeout: 15000,
    });

    ssidSelect.innerHTML = '<option value="">-- Pilih jaringan WiFi --</option>'; // Opsi default
    if (response.data && response.data.length > 0) {
      response.data.forEach((ssid) => {
        if (ssid) {
          const option = document.createElement("option");
          option.value = ssid;
          option.textContent = ssid;
          ssidSelect.appendChild(option);
        }
      });
      showToast(`Pindai WiFi selesai, silahkan pilih jaringan WiFi.`);
    } else {
      showToast(`Tidak ada jaringan WiFi ditemukan.`, true);
    }
  } catch (error) {
    console.error(`Gagal memindai WiFi dari ${SCAN_DEVICE_HOSTNAME}:`, error);
    showToast(
      `Gagal memindai. Pastikan perangkat Anda terhubung ke jaringan yang sama dengan Perangkat GrowMatic.`,
      true
    );
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<i class="fas fa-search"></i> Pindai Jaringan WiFi';
  }
}

/**
 * Mengirim kredensial WiFi baru ke SEMUA ESP32 secara lokal.
 * Pengguna HARUS terhubung ke jaringan WiFi yang sama dengan SEMUA ESP32 ini.
 * @param {Event} e - Event dari form submission
 */
async function setWifi(e) {
  e.preventDefault();

  const ssid = ssidSelect.value;
  const password = passwordInput.value;

  if (!ssid) {
    showToast("Pilih Nama WiFi (SSID) dari daftar.", true);
    return;
  }

  const customConfirm = (message, onConfirm, onCancel) => {
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
  };

  const message =
    `Anda akan mengubah koneksi WiFi UNTUK SEMUA PERANGKAT GROW-MATIC (1, 2, 3, dan 4) ke "${ssid}".\n\n` +
    `Setiap perangkat akan restart dan mencoba terhubung ke jaringan baru. ` +
    `Jika gagal untuk salah satu perangkat, Anda mungkin perlu terhubung ke Access Point "ConfigGrowMatic" pada perangkat tersebut untuk mengatur ulang secara individu.\n\n` +
    `Lanjutkan?`;

  customConfirm(
    message,
    async () => {
      // Mengubah tombol submit, bukan tombol toggle password
      submitWifiBtn.disabled = true;
      submitWifiBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Mengirim konfigurasi...';

      const results = [];
      const params = new URLSearchParams();
      params.append("ssid", ssid);
      params.append("password", password);

      for (const hostname of ALL_DEVICE_HOSTNAMES) {
        try {
          const deviceUrl = `http://${hostname}.local`;
          console.log(`Mengirim konfigurasi WiFi ke: ${deviceUrl}`);
          const response = await axios.post(deviceUrl + '/set-wifi', params, { timeout: 10000 }); // Timeout per perangkat
          results.push({ device: hostname, success: true, message: response.data });
        } catch (error) {
          console.error(`Gagal mengatur WiFi untuk ${hostname}:`, error);
          results.push({
            device: hostname,
            success: false,
            message: `Gagal terhubung. Pastikan terhubung ke jaringan yang sama dengan ${hostname}.`,
          });
        }
      }

      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
          showToast("Konfigurasi WiFi berhasil dikirim ke semua perangkat!", false);
      } else {
          const failedDevices = results.filter(r => !r.success).map(r => r.device).join(', ');
          showToast(`Beberapa perangkat gagal dikonfigurasi: ${failedDevices}. Cek detail di konsol browser.`, true);
          console.error("Detail Konfigurasi WiFi Global:", results);
      }

      // Mengembalikan tombol submit ke kondisi semula
      submitWifiBtn.disabled = false;
      submitWifiBtn.innerHTML =
        '<i class="fas fa-save"></i> Simpan & Restart Perangkat';
    },
    () => {
      showToast("Pengaturan WiFi dibatalkan.", true);
    }
  );
}

// Menambahkan Event Listeners saat dokumen dimuat
document.addEventListener("DOMContentLoaded", () => {
  if (scanBtn) {
    scanBtn.addEventListener("click", scanWifi);
  }

  // Periksa apakah submitWifiBtn ada sebelum menambahkan listener
  // Ini memastikan tombol submit-wifi-btn sudah ada di DOM
  if (wifiForm && submitWifiBtn) {
    wifiForm.addEventListener("submit", setWifi);
  }

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      const icon = togglePasswordBtn.querySelector("i");
      if (type === "password") {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      } else {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    });
  }
});
