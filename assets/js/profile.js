document.querySelector(".menu-btn").addEventListener("click", function () {
  document.getElementById("sidebar").style.transform = "translateX(0)";
});

// Script untuk edit profile (contoh)
document.querySelectorAll(".btn-edit").forEach((btn) => {
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    alert("Edit feature will be available soon!");
  });
});
