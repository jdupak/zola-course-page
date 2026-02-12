// Close mobile ToC when a link inside it is clicked.
(function() {
    const tocControl = document.getElementById('toc-control');
    const tocAside = document.querySelector('.course-toc-mobile-content');
    if (tocAside && tocControl) {
        tocAside.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                tocControl.checked = false;
            }
        });
    }
})();
