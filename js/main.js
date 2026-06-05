document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. Mobile Menu Controller (A11y Compliant)
    // ==========================================================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinksMenu = document.getElementById('nav-links-menu');

    if (mobileMenuBtn && navLinksMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            // Toggle the open class for CSS transitions
            const isOpen = navLinksMenu.classList.toggle('open');
            
            // Update aria-expanded strictly for screen readers to reflect dropdown state
            mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
        });
    }

    // ==========================================================================
    // 2. Smart Header & Back-To-Top Scroll Effects
    // ==========================================================================
    const header = document.getElementById('main-header');
    const backToTopBtn = document.getElementById('back-to-top');
    
    let lastScrollY = window.scrollY;
    const scrollThreshold = 100; // Point at which the back-to-top button appears

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // --- Handle Smart Header ---
        if (header) {
            if (currentScrollY <= 0) {
                // At the absolute top: remove all dynamic scroll classes
                header.classList.remove('scroll-up', 'scroll-down');
            } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
                // Scrolling DOWN: Hide header
                header.classList.remove('scroll-up');
                header.classList.add('scroll-down');
                
                // UX Enhancement: Close mobile menu if it's open while scrolling down
                if (navLinksMenu && navLinksMenu.classList.contains('open')) {
                    navLinksMenu.classList.remove('open');
                    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            } else if (currentScrollY < lastScrollY) {
                // Scrolling UP: Reveal header
                header.classList.remove('scroll-down');
                header.classList.add('scroll-up');
            }
        }

        // --- Handle Back-to-Top Button Visibility ---
        if (backToTopBtn) {
            if (currentScrollY > scrollThreshold) {
                backToTopBtn.classList.add('visible'); // Reveals button via CSS
            } else {
                backToTopBtn.classList.remove('visible'); // Hides button
            }
        }

        // Update the last scroll position for the next event trigger
        lastScrollY = currentScrollY;
    });

    // ==========================================================================
    // 3. Back-To-Top Click Action
    // ==========================================================================
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            // Smoothly scroll back to the absolute top of the document
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

});