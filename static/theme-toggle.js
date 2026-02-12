// Theme toggle: cycles auto → light → dark → auto.
(function () {
    const toggle = document.getElementById("theme-toggle");
    const html = document.documentElement;
    const lightSyntax = document.getElementById("syntax-theme-light");
    const darkSyntax = document.getElementById("syntax-theme-dark");

    if (!toggle || !html || !lightSyntax || !darkSyntax) {
        return;
    }

    function updateSyntaxTheme(theme) {
        if (theme === "dark") {
            lightSyntax.media = "not all";
            darkSyntax.media = "screen";
        } else if (theme === "light") {
            lightSyntax.media = "screen";
            darkSyntax.media = "not all";
        } else {
            // Reset to system preference
            lightSyntax.media = "screen";
            darkSyntax.media = "screen and (prefers-color-scheme: dark)";
        }
    }

    function setTheme(theme) {
        if (theme === "light" || theme === "dark") {
            html.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
            updateSyntaxTheme(theme);
        } else {
            // "auto": remove override and follow system preference.
            html.removeAttribute("data-theme");
            localStorage.removeItem("theme");
            updateSyntaxTheme("auto");
        }

        const modeLabel =
            theme === "light" ? "Theme: light" : theme === "dark" ? "Theme: dark" : "Theme: auto";
        toggle.setAttribute("aria-label", modeLabel);
        toggle.setAttribute("title", modeLabel);
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
    }

    toggle.addEventListener("click", function () {
        // Cycle: auto -> light -> dark -> auto
        //
        // Note: when in "auto", there is no data-theme attribute.
        const currentTheme = html.getAttribute("data-theme") || "auto";
        const nextTheme =
            currentTheme === "auto"
                ? "light"
                : currentTheme === "light"
                  ? "dark"
                  : "auto";

        setTheme(nextTheme);
    });
})();
