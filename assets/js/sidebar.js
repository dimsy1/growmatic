const sidebar = document.getElementById("sidebar");
const openBtn = document.querySelector(".menu-btn");
const closeBtn = document.getElementById("close-sidebar");

openBtn.addEventListener("click", () => {
  sidebar.style.transform = "translateX(0)";
});

closeBtn.addEventListener("click", () => {
  sidebar.style.transform = "translateX(-100%)";
});

document.querySelectorAll(".submenu-toggle").forEach((toggle) => {
  toggle.addEventListener("click", function (e) {
    e.preventDefault();
    this.classList.toggle("active");
    const submenu = this.nextElementSibling;
    submenu.classList.toggle("active");
  });
});
