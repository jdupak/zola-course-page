(function () {
  // Persist/restore scroll position for the navigation sidebar.
  //
  // With the updated mobile sidebar structure, the scroll container on mobile is
  // the <aside.course-menu> itself (fixed + overflow-y: auto).
  // On desktop, the scroll container remains the inner <nav> element (sticky).
  const menuNav = document.querySelector("aside.course-menu nav");
  const menuAside = document.querySelector("aside.course-menu");

  if (!menuNav || !menuAside) return;

  // Namespace the storage key by path so multiple sites on the same domain
  // (e.g. GitLab Pages subgroups) don't collide.
  var base = document.querySelector("base");
  var prefix = (base && base.getAttribute("href")) || location.pathname.replace(/\/[^/]*$/, "/");
  var STORAGE_KEY = prefix + "menu.scrollTop";

  function getScrollContainer() {
    // If the sidebar itself scrolls, it will have overflow-y set to auto/scroll and
    // a scrollHeight larger than its clientHeight.
    const asideStyles = getComputedStyle(menuAside);
    const asideScrollable =
      (asideStyles.overflowY === "auto" ||
        asideStyles.overflowY === "scroll") &&
      menuAside.scrollHeight > menuAside.clientHeight;

    return asideScrollable ? menuAside : menuNav;
  }

  function restore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return;

    const value = parseInt(raw, 10);
    if (!Number.isFinite(value)) return;

    getScrollContainer().scrollTop = value;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, String(getScrollContainer().scrollTop));
  }

  // Restore on load
  restore();

  // Persist on navigation away and on tab hide (covers mobile better than beforeunload alone).
  addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") persist();
  });

  // If layout changes (e.g. responsive breakpoint), re-apply to the new scroll container.
  addEventListener("resize", restore);
})();
