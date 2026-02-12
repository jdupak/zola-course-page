// Keyboard support for sidebar toggles and global Escape handling.
(function() {
    const SIDEBAR_CONTROLS = ['menu-control', 'toc-control'];

    function getControl(id) {
        return document.getElementById(id);
    }

    function getHeaderLabel(controlId) {
        return document.querySelector('.course-header label[for="' + controlId + '"]');
    }

    function syncExpanded(controlId) {
        const control = getControl(controlId);
        const label = getHeaderLabel(controlId);
        if (!control || !label) return;
        label.setAttribute('aria-expanded', control.checked ? 'true' : 'false');
    }

    function closeSidebars() {
        SIDEBAR_CONTROLS.forEach(function(controlId) {
            const control = getControl(controlId);
            if (control) {
                control.checked = false;
                syncExpanded(controlId);
            }
        });
    }

    function toggleControl(controlId) {
        const control = getControl(controlId);
        if (!control) return;
        control.checked = !control.checked;
        syncExpanded(controlId);
    }

    function initHeaderToggle(controlId) {
        const control = getControl(controlId);
        const label = getHeaderLabel(controlId);
        if (!control || !label) return;

        // Make label focusable
        if (!label.hasAttribute('tabindex')) {
            label.setAttribute('tabindex', '0');
        }

        // Initialize aria-expanded
        syncExpanded(controlId);

        // Sync aria-expanded when checkbox changes
        control.addEventListener('change', function() {
            syncExpanded(controlId);
        });

        // Sync after pointer click (checkbox flips on next tick)
        label.addEventListener('click', function() {
            setTimeout(function() {
                syncExpanded(controlId);
            }, 0);
        });
    }

    // Initialize both sidebar toggles
    SIDEBAR_CONTROLS.forEach(initHeaderToggle);

    // Global keyboard event delegation
    document.addEventListener('keydown', function(e) {
        const key = e.key;
        const activeElement = document.activeElement;

        // Escape: close all sidebars
        if (key === 'Escape') {
            e.preventDefault();
            closeSidebars();
            return;
        }

        // Enter/Space: toggle sidebar if focus is on/in a toggle label
        if (key !== 'Enter' && key !== ' ') return;
        if (!activeElement) return;

        // Check which control (if any) the active element belongs to
        for (let i = 0; i < SIDEBAR_CONTROLS.length; i++) {
            const controlId = SIDEBAR_CONTROLS[i];
            const label = getHeaderLabel(controlId);
            
            if (label && (activeElement === label || label.contains(activeElement))) {
                e.preventDefault(); // prevents page scroll on Space
                toggleControl(controlId);
                return;
            }
        }
    }, true);
})();
