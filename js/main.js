document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. Mobile Menu Controller
    // ==========================================================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinksMenu = document.getElementById('nav-links-menu');

    if (mobileMenuBtn && navLinksMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = navLinksMenu.classList.toggle('open');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
        });
    }

    // ==========================================================================
    // 2. Smart Header & Back-To-Top Scroll Effects
    // ==========================================================================
    const header = document.getElementById('main-header');
    const backToTopBtn = document.getElementById('back-to-top');
    let lastScrollY = window.scrollY;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (header) {
            if (currentScrollY <= 0) {
                header.classList.remove('scroll-up', 'scroll-down');
            } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
                header.classList.remove('scroll-up');
                header.classList.add('scroll-down');
                if (navLinksMenu && navLinksMenu.classList.contains('open')) {
                    navLinksMenu.classList.remove('open');
                    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            } else if (currentScrollY < lastScrollY) {
                header.classList.remove('scroll-down');
                header.classList.add('scroll-up');
            }
        }

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
        });
    }

    // ==========================================================================
    // 3. Smart Search System (Lazy Loaded)
    // ==========================================================================
    const searchTriggerBtn = document.getElementById('search-trigger-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearchBtn = document.getElementById('close-search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsList = document.getElementById('search-results-list');
    
    let searchIndex = null; // Holds the JSON data
    const basePath = window.ASB_BASE_PATH || '';

    // Function to fetch the search index JSON (Lazy Load)
    const loadSearchData = async () => {
        if (searchIndex !== null) return; // Already loaded
        try {
            const response = await fetch(basePath + 'search.json');
            searchIndex = await response.json();
        } catch (error) {
            console.error("Error loading search index:", error);
            searchResultsList.innerHTML = '<li class="sr-empty">خطا در بارگذاری اطلاعات.</li>';
        }
    };

    // Open Search Modal
    if (searchTriggerBtn && searchOverlay) {
        searchTriggerBtn.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            searchInput.focus();
            loadSearchData(); // Fetch JSON only when opened
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }

    // Close Search Modal
    const closeSearch = () => {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResultsList.innerHTML = '';
        document.body.style.overflow = ''; // Restore background scrolling
    };

    if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearch);

    // Close on clicking outside the modal box
    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) closeSearch();
        });
    }

    // Live Search Logic
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            searchResultsList.innerHTML = '';

            if (query === '' || !searchIndex) return;

            // Filter the index based on query matching title, author, category, or tags
            const results = searchIndex.filter(post => {
                const matchTitle = post.title.toLowerCase().includes(query);
                const matchAuthor = post.author.toLowerCase().includes(query);
                const matchCategory = post.category.toLowerCase().includes(query);
                const matchTags = post.tags.some(tag => tag.toLowerCase().includes(query));
                return matchTitle || matchAuthor || matchCategory || matchTags;
            });

            // Render Results
            if (results.length > 0) {
                results.forEach(post => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <a href="${basePath}${post.url}" onclick="document.body.style.overflow='';">
                            <span class="sr-title">${post.title}</span>
                            <span class="sr-meta">${post.author} &bull; ${post.category}</span>
                        </a>
                    `;
                    searchResultsList.appendChild(li);
                });
            } else {
                searchResultsList.innerHTML = '<li class="sr-empty">متأسفانه نتیجه‌ای یافت نشد.</li>';
            }
        });
    }

});
