const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");
const storedTheme = localStorage.getItem("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (storedTheme === "light" || storedTheme === "dark") {
  root.dataset.theme = storedTheme;
} else {
  root.dataset.theme = systemDark ? "dark" : "light";
}

themeButton?.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));

themeButton?.addEventListener("click", () => {
  const currentTheme = root.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  root.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
  themeButton.setAttribute("aria-pressed", String(nextTheme === "dark"));
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  root.classList.add("motion-ready");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
}
