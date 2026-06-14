function centerProductSection() {
  if (!window.location.hash) return;
  const target = document.getElementById(window.location.hash.slice(1));
  if (!target) return;
  const center = () => target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(center, 40);
  window.setTimeout(center, 350);
  window.setTimeout(center, 900);
}

window.addEventListener("load", centerProductSection);
window.addEventListener("hashchange", centerProductSection);
