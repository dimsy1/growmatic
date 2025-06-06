document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const loader = document.getElementById("wifi-loader");
    const textElement = loader.querySelector(".text");
    loader.style.display = "flex";
    document.getElementById("loaderOverlay").style.display = "block";

    try {
      const res = await fetch(
        "https://growmatic.tifpsdku.com/api/admin-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        // Change loader text to "Success"
        textElement.setAttribute("data-text", "Loading...");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 3000);
      } else {
        loader.style.display = "none";
        document.getElementById("loaderOverlay").style.display = "none";
        showToast(data.message);
      }
    } catch (err) {
      loader.style.display = "none";
      document.getElementById("loaderOverlay").style.display = "none";
      showToast("Terjadi kesalahan: " + err.message);
    }
  });

// Function to show toast notification
function showToast(message) {
  const toast = document.createElement("div");
  toast.classList.add("toast");
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
