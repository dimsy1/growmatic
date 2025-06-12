// Thinger.io credentials
const USERNAME = "dimas-y";
const DEVICE_ID = "grow_matic_3";
const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJ0b2tlbl9kYXNoYm9hcmRfMyIsInN2ciI6ImFwLXNvdXRoZWFzdC5hd3MudGhpbmdlci5pbyIsInVzciI6ImRpbWFzLXkifQ.8TOw6eyDEialwoPcVBgyEV45lUcmxvRjVmUuRRWtvZY";

// Chart references
let consumptionChart;
let currentTimeRange = "minute"; // Default time range

// Current values
let currentTemp = null;
let currentHum = null;
let currentRelayState = false;
let currentMode = true;

// Data storage for different time ranges
const dataStores = {
  minute: {
    tempData: [],
    humidityData: [],
    timeLabels: [],
    maxPoints: 60, // Last 60 minutes
  },
  hour: {
    tempData: [],
    humidityData: [],
    timeLabels: [],
    maxPoints: 24, // Last 24 hours
  },
  day: {
    tempData: [],
    humidityData: [],
    timeLabels: [],
    maxPoints: 7, // Last 7 days
  },
};

// Function to fetch data from Thinger.io
async function fetchThingerData() {
  try {
    // Get sensor data
    const sensorResponse = await axios.get(
      `https://backend.thinger.io/v3/users/${USERNAME}/devices/${DEVICE_ID}/resources/sensor`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
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
    const relayResponse = await axios.get(
      `https://backend.thinger.io/v3/users/${USERNAME}/devices/${DEVICE_ID}/resources/relay`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );
    updateRelayDisplay(relayResponse.data);

    // Get mode
    const modeResponse = await axios.get(
      `https://backend.thinger.io/v3/users/${USERNAME}/devices/${DEVICE_ID}/resources/mode`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );
    updateModeDisplay(modeResponse.data);
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
  const now = new Date();
  const currentStore = dataStores[currentTimeRange];

  // Create appropriate time label based on current time range
  let timeLabel;
  if (currentTimeRange === "minute") {
    timeLabel = `${now.getHours()}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  } else if (currentTimeRange === "hour") {
    timeLabel = `${now.getHours()}:00`;
  } else {
    // day
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    timeLabel = days[now.getDay()];
  }

  // Check if we need to update existing data or add new
  if (currentStore.timeLabels.length > 0) {
    const lastLabel =
      currentStore.timeLabels[currentStore.timeLabels.length - 1];

    if (currentTimeRange === "minute") {
      // For minute data, always add new point
      addDataPoint(currentStore, timeLabel, temp, hum);
    } else if (currentTimeRange === "hour" && timeLabel === lastLabel) {
      // For hour data, update the current hour's data
      const lastIndex = currentStore.timeLabels.length - 1;
      currentStore.tempData[lastIndex] = temp;
      currentStore.humidityData[lastIndex] = hum;
    } else if (currentTimeRange === "day" && timeLabel === lastLabel) {
      // For day data, update the current day's data
      const lastIndex = currentStore.timeLabels.length - 1;
      currentStore.tempData[lastIndex] = temp;
      currentStore.humidityData[lastIndex] = hum;
    } else {
      // Time period changed, add new point
      addDataPoint(currentStore, timeLabel, temp, hum);
    }
  } else {
    // First data point
    addDataPoint(currentStore, timeLabel, temp, hum);
  }

  // Update chart with current data store
  updateChart();
}

function addDataPoint(store, label, temp, hum) {
  store.timeLabels.push(label);
  store.tempData.push(temp);
  store.humidityData.push(hum);

  // Limit data points to maxPoints
  if (store.timeLabels.length > store.maxPoints) {
    store.timeLabels.shift();
    store.tempData.shift();
    store.humidityData.shift();
  }
}

function updateChart() {
  const currentStore = dataStores[currentTimeRange];

  consumptionChart.data.labels = currentStore.timeLabels;
  consumptionChart.data.datasets[0].data = currentStore.tempData;
  consumptionChart.data.datasets[1].data = currentStore.humidityData;

  // Update chart title based on time range
  let title;
  if (currentTimeRange === "minute") {
    title = "Data Per Menit (60 menit terakhir)";
  } else if (currentTimeRange === "hour") {
    title = "Data Per Jam (24 jam terakhir)";
  } else {
    title = "Data Per Hari (7 hari terakhir)";
  }

  consumptionChart.options.plugins.title = {
    display: true,
    text: title,
    font: {
      size: 14,
    },
  };

  consumptionChart.update();
}

// Function to control relay
async function controlRelay(state) {
  try {
    await axios.post(
      `https://backend.thinger.io/v3/users/${USERNAME}/devices/${DEVICE_ID}/resources/relay`,
      state,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
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
      `https://backend.thinger.io/v3/users/${USERNAME}/devices/${DEVICE_ID}/resources/mode`,
      autoMode,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
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

// Konfigurasi OpenWeatherMap
const WEATHER_API_KEY = "040cb215c1aeeb20f1c9495c092366c4"; // Ganti dengan API key Anda

async function fetchWeatherByLocation(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=id&appid=${WEATHER_API_KEY}`
    );
    const data = await response.json();

    if (data.main && data.main.temp) {
      const temp = Math.round(data.main.temp);
      document.getElementById("outside-temp").innerText = `${temp}°`;

      // Tampilkan nama lokasi
      const locationName = data.name || "Lokasi Anda";
      document.getElementById("weather-location").innerText = locationName;

      // Update ikon dan deskripsi cuaca
      const weatherIcon = document.getElementById("weather-icon");
      if (data.weather && data.weather[0]) {
        const weatherDesc = data.weather[0].description;
        document.getElementById("weather-description").innerText = weatherDesc;

        // Mapping ikon cuaca
        const iconMap = {
          "01": "sun", // clear sky
          "02": "cloud-sun", // few clouds
          "03": "cloud", // scattered clouds
          "04": "cloud", // broken clouds
          "09": "cloud-rain", // shower rain
          10: "cloud-rain", // rain
          11: "bolt", // thunderstorm
          13: "snowflake", // snow
          50: "smog", // mist
        };

        const iconCode = data.weather[0].icon.substring(0, 2);
        if (iconMap[iconCode]) {
          weatherIcon.className = `fas fa-${iconMap[iconCode]}`;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching weather data:", error);
    document.getElementById("outside-temp").innerText = "--°";
    document.getElementById("weather-location").innerText =
      "Gagal memuat data cuaca";
  }
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByLocation(lat, lon);
      },
      (error) => {
        console.error("Error getting location:", error);
        // Fallback ke lokasi default jika izin ditolak
        fetchWeatherByLocation(-6.2088, 106.8456); // Jakarta sebagai fallback
      }
    );
  } else {
    console.log("Geolocation is not supported by this browser.");
    // Fallback ke lokasi default
    fetchWeatherByLocation(-6.2088, 106.8456); // Jakarta sebagai fallback
  }
}

// Initialize the app
window.onload = function () {
  // Initialize chart
  const ctx = document.getElementById("consumption-chart").getContext("2d");

  consumptionChart = new Chart(ctx, {
    type: "line", // Changed to line chart for better time series visualization
    data: {
      labels: [],
      datasets: [
        {
          label: "Suhu (°C)",
          data: [],
          backgroundColor: "rgba(0, 191, 165, 0.2)",
          borderColor: "rgba(0, 191, 165, 1)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
        {
          label: "Kelembaban (%)",
          data: [],
          backgroundColor: "rgba(255, 112, 67, 0.2)",
          borderColor: "rgba(255, 112, 67, 1)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
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
            display: true,
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
        title: {
          display: true,
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

  // Time range selector
  document
    .querySelector(".period-selector")
    .addEventListener("change", function () {
      currentTimeRange = this.value.toLowerCase();
      updateChart();
    });

  // Fetch initial data
  fetchThingerData();

  // Set up periodic data refresh (every 10 seconds)
  setInterval(fetchThingerData, 10000);
};
