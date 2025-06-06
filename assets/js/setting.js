document
  .getElementById("wifiForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const ssid = document.getElementById("wifi-ssid").value;
    const password = document.getElementById("wifi-password").value;
    const deviceId = document.getElementById("device-id").value;

    try {
      // Simpan konfigurasi ke server
      const response = await fetch("/api/configure-wifi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          ssid,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("WiFi configuration saved successfully!");
      } else {
        throw new Error(data.message || "Failed to save configuration");
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Error: " + error.message);
    }
  });

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}
