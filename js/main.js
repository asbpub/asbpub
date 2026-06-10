document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. Mobile Menu Controller
    // ==========================================================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinksMenu = document.getElementById('nav-links-menu');

    if (mobileMenuBtn && navLinksMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = navLinksMenu.classList.toggle('open');
            // Accessibility: Announce menu state to screen readers
            mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
        });
    }

    // ==========================================================================
    // 2. Smart Header & Back-To-Top System
    // ==========================================================================
    const header = document.getElementById('main-header');
    const backToTopBtn = document.getElementById('back-to-top');
    let lastScrollY = window.scrollY;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Smart Header Logic
        if (header) {
            if (currentScrollY <= 0) {
                header.classList.remove('scroll-up', 'scroll-down');
            } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
                header.classList.remove('scroll-up');
                header.classList.add('scroll-down');
                // Close mobile menu automatically on scroll down
                if (navLinksMenu && navLinksMenu.classList.contains('open')) {
                    navLinksMenu.classList.remove('open');
                    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            } else if (currentScrollY < lastScrollY) {
                header.classList.remove('scroll-down');
                header.classList.add('scroll-up');
            }
        }

        // Back-To-Top Button Visibility
        if (backToTopBtn) {
            if (currentScrollY > scrollThreshold) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }
        lastScrollY = currentScrollY;
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Accessibility: Reset keyboard focus to top of the document
            document.body.setAttribute('tabindex', '-1');
            document.body.focus({ preventScroll: true });
        });
    }

    // ==========================================================================
    // 3. Inline Smart Search System (WCAG Compliant)
    // ==========================================================================
    const searchInput = document.getElementById('inline-search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    const searchResultsList = document.getElementById('search-results-list');
    
    let searchIndex = null; 
    const basePath = window.ASB_BASE_PATH || '';

    // Initialize Accessibility Attributes
    if (searchInput && searchResultsList) {
        searchInput.setAttribute('role', 'combobox');
        searchInput.setAttribute('aria-autocomplete', 'list');
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.setAttribute('aria-controls', 'search-results-list');
        searchResultsList.setAttribute('role', 'listbox');
        
        // This makes screen readers announce search results dynamically
        searchResultsList.setAttribute('aria-live', 'polite'); 
    }

    const loadSearchData = async () => {
        if (searchIndex !== null) return; 
        try {
            const response = await fetch(basePath + 'search.json');
            searchIndex = await response.json();
        } catch (error) {
            console.error("Error loading search index:", error);
            if (searchResultsList) {
                searchResultsList.innerHTML = '<li class="sr-empty" role="option">خطا در بارگذاری اطلاعات.</li>';
            }
        }
    };

    if (searchInput && searchDropdown) {
        // Fetch JSON when user interacts with the search box
        searchInput.addEventListener('focus', () => {
            loadSearchData();
            if (searchInput.value.trim() !== '') {
                searchDropdown.classList.add('active');
                searchInput.setAttribute('aria-expanded', 'true');
            }
        });

        // Live Search Processing Logic
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            searchResultsList.innerHTML = '';

            if (query === '') {
                searchDropdown.classList.remove('active');
                searchInput.setAttribute('aria-expanded', 'false');
                return;
            }

            searchDropdown.classList.add('active');
            searchInput.setAttribute('aria-expanded', 'true');

            if (!searchIndex) {
                searchResultsList.innerHTML = '<li class="sr-empty" role="option">در حال جست‌وجو...</li>';
                return;
            }

            const results = searchIndex.filter(post => {
                const matchTitle = post.title.toLowerCase().includes(query);
                const matchAuthor = post.author.toLowerCase().includes(query);
                const matchCategory = post.category.toLowerCase().includes(query);
                const matchTags = post.tags.some(tag => tag.toLowerCase().includes(query));
                return matchTitle || matchAuthor || matchCategory || matchTags;
            });

            if (results.length > 0) {
                results.forEach((post) => {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'option'); // WCAG compliance for list items
                    li.innerHTML = `
                        <a href="${basePath}${post.url}">
                            <span class="sr-title">${post.title}</span>
                            <span class="sr-meta">${post.author} &bull; ${post.category}</span>
                        </a>
                    `;
                    searchResultsList.appendChild(li);
                });
            } else {
                searchResultsList.innerHTML = '<li class="sr-empty" role="option">متأسفانه نتیجه‌ای یافت نشد.</li>';
            }
        });

        // Close dropdown when clicking anywhere outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
                searchInput.setAttribute('aria-expanded', 'false');
            }
        });

        // Accessibility: Allow users to close the dropdown using the 'Escape' key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchDropdown.classList.remove('active');
                searchInput.setAttribute('aria-expanded', 'false');
                searchInput.blur();
            }
        });
    }
});
