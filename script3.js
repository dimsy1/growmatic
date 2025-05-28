const manifestData = {
  name: "Grow Matic Dashboard",
  short_name: "Grow Matic",
  start_url: "https://growmatic.tifpsdku.com/dashboard.html",
  display: "standalone",
  background_color: "#f7f9fc",
  theme_color: "#f7f9fc",
  icons: [
    {
      src: "https://growmatic.tifpsdku.com/Assets/logo.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "https://growmatic.tifpsdku.com/Assets/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

const manifestBlob = new Blob([JSON.stringify(manifestData)], {
  type: "application/json",
});
const manifestURL = URL.createObjectURL(manifestBlob);
document
  .getElementById("manifest-placeholder")
  .setAttribute("href", manifestURL);

// Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      console.log("ServiceWorker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.error("ServiceWorker registration failed:", error);
    });
}

// Thinger.io credentials
const USERNAME = "dimas-y";
const DEVICE_ID = "grow_matic_3";
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXYiOiJncm93X21hdGljXzMiLCJpYXQiOjE3NDY2NzYzMjcsImp0aSI6IjY4MWMyYTY3YWI1ODQxZDNlMzBiYjFjNyIsInN2ciI6ImFwLW5vcnRoZWFzdC5hd3MudGhpbmdlci5pbyIsInVzciI6ImRpbWFzLXkifQ.6wRUib0k_v7lyUzg3zry4eIE5nMvR_AV7ycnPUsLAgo";

// Chart reference
let consumptionChart;

// Current values
let currentTemp = null;
let currentHum = null;
let currentRelayState = false;
let currentMode = true;

// Data arrays for chart
const tempData = [];
const humidityData = [];
const timeLabels = [];

// Function to fetch data from Thinger.io
async function fetchThingerData() {
  try {
    // Get sensor data
    const sensorResponse = await axios.get(
      `https://backend.thinger.io/v3/users/subektibimowicaksono/devices/grow_matic/resources/sensor`, // Belum diganti
      {
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXYiOiJncm93X21hdGljXzMiLCJpYXQiOjE3NDY2NzYzMjcsImp0aSI6IjY4MWMyYTY3YWI1ODQxZDNlMzBiYjFjNyIsInN2ciI6ImFwLW5vcnRoZWFzdC5hd3MudGhpbmdlci5pbyIsInVzciI6ImRpbWFzLXkifQ.6wRUib0k_v7lyUzg3zry4eIE5nMvR_AV7ycnPUsLAgo`,
        },
      }
    );

    const sensorData = sensorResponse.data;
    if (
      sensorData &&
      sensorData.temperature !== undefined &&
      sensorData.humidity !== undefined
    ) {
      updateSensorDisplay(sensorData.temperature, sensorData.humidity);
      handleSensorData(sensorData.temperature, sensorData.humidity);
    }

    // Get relay state

    // Get mode
  } catch (error) {
    console.error("Error fetching data from Thinger.io:", error);
    showToast("Failed to fetch data");
  }
}

// Update sensor display
function updateSensorDisplay(temp, hum) {
  document.getElementById("suhu-value").innerText = temp.toFixed(1);
  document.getElementById("kelembaban-value").innerText = hum.toFixed(1);
  currentTemp = temp;
  currentHum = hum;
}

// Update relay display
function updateRelayDisplay(state) {
  document.getElementById("relay-status").innerText = `Status: ${
    state ? "ON" : "OFF"
  }`;
  document.getElementById("pompa-toggle").checked = state;
  currentRelayState = state;
}

// Update mode display
function updateModeDisplay(isAuto) {
  document.getElementById("mode-status").innerText = `Status: ${
    isAuto ? "Otomatis" : "Manual"
  }`;
  document.getElementById("mode-toggle").checked = isAuto;
  document.getElementById("pompa-toggle").disabled = isAuto;
  currentMode = isAuto;
}

function handleSensorData(temp, hum) {
  currentTemp = temp;
  currentHum = hum;

  const now = new Date();
  const timeLabel = `${now.getHours()}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  // Tambahkan data ke grafik
  timeLabels.push(timeLabel);
  tempData.push(temp);
  humidityData.push(hum);

  // Batasi data hanya 7 terakhir
  if (timeLabels.length > 7) {
    timeLabels.shift();
    tempData.shift();
    humidityData.shift();
  }

  consumptionChart.data.labels = timeLabels;
  consumptionChart.data.datasets[0].data = tempData;
  consumptionChart.data.datasets[1].data = humidityData;
  consumptionChart.update();
}

// Panggil fungsi saveToDatabase tiap 60 detik
setInterval(() => {
  if (currentTemp !== null && currentHum !== null) {
    saveToDatabase(currentTemp, currentHum);
  }
}, 30000); // 60 detik

// Function untuk simpan ke database
async function saveToDatabase(temp, hum) {
  const data = {
    temperature: temp,
    humidity: hum,
  };

  try {
    const response = await fetch(
      "https://growmatic.tifpsdku.com/api/save-data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();
    console.log("Data saved to database:", result);

    fetchHistoricalData();
  } catch (error) {
    console.error("Error saving data to database:", error);
  }
}

// Function to fetch historical data
async function fetchHistoricalData() {
  try {
    const response = await fetch("https://growmatic.tifpsdku.com/api/get-data");
    const data = await response.json();

    if (data && data.length > 0) {
      // Get the last 7 data points
      const limitedData = data.slice(0, 7).reverse(); // ambil 7 data terbaru lalu urutkan dari lama ke baru

      // Clear existing arrays
      timeLabels.length = 0;
      tempData.length = 0;
      humidityData.length = 0;

      // Populate with historical data
      limitedData.forEach((item) => {
        const date = new Date(item.timestamp);
        const timeLabel =
          date.getHours() + ":" + date.getMinutes().toString().padStart(2, "0");

        timeLabels.push(timeLabel);
        tempData.push(item.temperature);
        humidityData.push(item.humidity);
      });

      // Update chart
      consumptionChart.data.labels = timeLabels;
      consumptionChart.data.datasets[0].data = tempData;
      consumptionChart.data.datasets[1].data = humidityData;
      consumptionChart.update();
    }
  } catch (error) {
    console.error("Error fetching historical data:", error);
  }
}

// Function to control relay
async function controlRelay(state) {
  try {
    await axios.post(
      `https://backend.thinger.io/v3/users/subektibimowicaksono/devices/grow_matic/resources/relay`, //belum diganti
      state,
      {
        headers: {
          Authorization: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXYiOiJncm93X21hdGljXzMiLCJpYXQiOjE3NDY2NzYzMjcsImp0aSI6IjY4MWMyYTY3YWI1ODQxZDNlMzBiYjFjNyIsInN2ciI6ImFwLW5vcnRoZWFzdC5hd3MudGhpbmdlci5pbyIsInVzciI6ImRpbWFzLXkifQ.6wRUib0k_v7lyUzg3zry4eIE5nMvR_AV7ycnPUsLAgo`,
          "Content-Type": "application/json",
        },
      }
    );

    updateRelayDisplay(state);
  } catch (error) {
    console.error("Error controlling relay:", error);
    // Revert UI state if control fails
    document.getElementById("pompa-toggle").checked = currentRelayState;
  }
}

// Function to set mode
async function setMode(autoMode) {
  try {
    await axios.post(
      `https://backend.thinger.io/v3/users/subektibimowicaksono/devices/grow_matic/resources/mode`, // Belum diganti
      autoMode,
      {
        headers: {
          Authorization: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXYiOiJncm93X21hdGljXzMiLCJpYXQiOjE3NDY2NzYzMjcsImp0aSI6IjY4MWMyYTY3YWI1ODQxZDNlMzBiYjFjNyIsInN2ciI6ImFwLW5vcnRoZWFzdC5hd3MudGhpbmdlci5pbyIsInVzciI6ImRpbWFzLXkifQ.6wRUib0k_v7lyUzg3zry4eIE5nMvR_AV7ycnPUsLAgo`,
          "Content-Type": "application/json",
        },
      }
    );

    updateModeDisplay(autoMode);
  } catch (error) {
    console.error("Error setting mode:", error);
    // Revert UI state if setting mode fails
    document.getElementById("mode-toggle").checked = currentMode;
  }
}

// Show a simple toast message
function showToast(message) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "80px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "rgba(0,0,0,0.7)";
  toast.style.color = "white";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "20px";
  toast.style.zIndex = "1000";
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Initialize the app
window.onload = function () {
  // Initialize chart
  const ctx = document.getElementById("consumption-chart").getContext("2d");

  consumptionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Suhu (°C)",
          data: tempData,
          backgroundColor: "rgba(0, 191, 165, 0.6)",
          borderColor: "rgba(0, 191, 165, 1)",
          borderWidth: 1,
        },
        {
          label: "Kelembaban (%)",
          data: humidityData,
          backgroundColor: "rgba(255, 112, 67, 0.6)",
          borderColor: "rgba(255, 112, 67, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            display: false,
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            boxWidth: 10,
            font: {
              size: 10,
            },
          },
        },
      },
    },
  });

  // Set up event listeners
  document
    .getElementById("pompa-toggle")
    .addEventListener("change", function () {
      if (!currentMode) {
        // Only allow control in manual mode
        controlRelay(this.checked);
      } else {
        this.checked = currentRelayState; // Revert if in auto mode
        showToast("Switch to manual mode first");
      }
    });

  document
    .getElementById("mode-toggle")
    .addEventListener("change", function () {
      setMode(this.checked);
    });

  // Set random outside temperature
  const outsideTemp = (Math.random() * 10 + 25).toFixed(0);
  document.getElementById("outside-temp").innerText = `${outsideTemp}°`;

  // Fetch initial data
  fetchThingerData();
  fetchHistoricalData();

  // Set up periodic data refresh (every 2 seconds)
  setInterval(fetchThingerData, 2000);
};
setInterval(fetchThingerData, 10000); // setiap 10 detik

const sidebar = document.getElementById("sidebar");
const openBtn = document.querySelector(".menu-btn");
const closeBtn = document.getElementById("close-sidebar");

openBtn.addEventListener("click", () => {
  sidebar.style.transform = "translateX(0)";
});

closeBtn.addEventListener("click", () => {
  sidebar.style.transform = "translateX(-100%)";
});
