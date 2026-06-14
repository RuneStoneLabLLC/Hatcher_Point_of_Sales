const form = document.querySelector("[data-contact-form]");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    if (status) {
      status.textContent = "Thanks. For now, please call or email Hatcher Supply directly while the live form endpoint is connected.";
    }
  });
}
