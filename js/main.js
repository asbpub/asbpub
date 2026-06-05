document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Configuration & References ---
    const themeBtn = document.getElementById('theme-toggler');
    
    // Accessibility-compliant SVGs (Hidden from screen readers)
    const svgMoon = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const svgSun = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

    // --- Theme Initialization ---
    const savedTheme = localStorage.getItem('asb-theme');
    if (savedTheme) {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(savedTheme);
    }
    
    // --- UI Synchronization & Accessibility ---
    const updateThemeUI = () => {
        if (!themeBtn) return;
        
        const isDark = document.body.classList.contains('theme-dark');
        
        // Sync icon graphics
        themeBtn.innerHTML = isDark ? svgSun : svgMoon;
        
        // Dynamically update aria-label for screen readers based on the NEXT action
        const currentAriaLabel = isDark ? 'تغییر قالب سایت به روشن' : 'تغییر قالب سایت به تاریک';
        themeBtn.setAttribute('aria-label', currentAriaLabel);
    };
    
    updateThemeUI();

    // --- Theme Toggle Controller ---
    themeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const isDark = document.body.classList.contains('theme-dark');
        const newTheme = isDark ? 'theme-light' : 'theme-dark';
        
        document.body.classList.replace(
            isDark ? 'theme-dark' : 'theme-light', 
            newTheme
        );
        
        localStorage.setItem('asb-theme', newTheme);
        updateThemeUI();
    });

    // --- Mobile Menu Controller (A11y Compliant) ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinksMenu = document.getElementById('nav-links-menu');

    mobileMenuBtn?.addEventListener('click', () => {
        if (!navLinksMenu) return;
        
        // Toggle the open class and determine current state
        const isOpen = navLinksMenu.classList.toggle('open');
        
        // Update aria-expanded strictly for screen readers to reflect dropdown state
        mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
    });
    
});