document.addEventListener('DOMContentLoaded', () => {

    // Global Constants
    const basePath = window.ASB_BASE_PATH || '';
    const ASB_API_URL = "https://asbpub-forms.asbpub-official.workers.dev"; // Your Cloudflare Worker URL

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
    // 2. Smart Header & Back-To-Top System
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

    if (searchInput && searchResultsList) {
        searchInput.setAttribute('role', 'combobox');
        searchInput.setAttribute('aria-autocomplete', 'list');
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.setAttribute('aria-controls', 'search-results-list');
        searchResultsList.setAttribute('role', 'listbox');
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
        searchInput.addEventListener('focus', () => {
            loadSearchData();
            if (searchInput.value.trim() !== '') {
                searchDropdown.classList.add('active');
                searchInput.setAttribute('aria-expanded', 'true');
            }
        });

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
                    li.setAttribute('role', 'option');
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

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
                searchInput.setAttribute('aria-expanded', 'false');
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchDropdown.classList.remove('active');
                searchInput.setAttribute('aria-expanded', 'false');
                searchInput.blur();
            }
        });
    }

    // ==========================================================================
    // 4. Story Interactions (Likes & Views Processing)
    // ==========================================================================
    const viewCountEl = document.getElementById('view-count');
    const likeCountEl = document.getElementById('like-count');
    const likeBtn = document.getElementById('like-btn');
    
    // Check if we are on a Story/Article reading page
    if (viewCountEl && likeCountEl && likeBtn) {
        
        // Extract Meta Data securely from the DOM
        const currentPath = window.location.pathname; // Unique URL key for KV
        const storyTitle = document.querySelector('.story-title')?.innerText || "بدون عنوان";
        const storyAuthor = document.querySelector('.meta-author')?.innerText || "";
        const storyDate = document.querySelector('.meta-date time')?.innerText || "";
        const coverImg = document.querySelector('.story-cover');
        const storyCover = coverImg ? coverImg.getAttribute('src') : "";

        // Check LocalStorage to see if user already liked this post
        const storageKey = `liked_${currentPath}`;
        let hasLiked = localStorage.getItem(storageKey) === 'true';

        if (hasLiked) {
            likeBtn.classList.add('liked');
            likeBtn.setAttribute('aria-label', 'شما این مطلب را پسندیده‌اید');
        }

        // Register View and Load Stats
        const registerView = async () => {
            try {
                const response = await fetch(`${ASB_API_URL}/api/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentPath,
                        title: storyTitle,
                        author: storyAuthor,
                        cover: storyCover,
                        date: storyDate
                    })
                });
                
                if (response.ok) {
                    const stats = await response.json();
                    viewCountEl.innerText = stats.views || 0;
                    likeCountEl.innerText = stats.likes || 0;
                }
            } catch (error) {
                console.error("Failed to register view/fetch stats:", error);
                viewCountEl.innerText = "-";
                likeCountEl.innerText = "-";
            }
        };

        // Fire the view registration
        registerView();

        // Handle Like Button Click
        likeBtn.addEventListener('click', async () => {
            if (hasLiked) return; // Prevent double-liking
            
            // Optimistic UI Update (Change UI instantly for better UX)
            hasLiked = true;
            localStorage.setItem(storageKey, 'true');
            likeBtn.classList.add('liked');
            likeBtn.setAttribute('aria-label', 'شما این مطلب را پسندیده‌اید');
            let currentLikes = parseInt(likeCountEl.innerText) || 0;
            likeCountEl.innerText = currentLikes + 1;

            // Send Like to Cloudflare
            try {
                await fetch(`${ASB_API_URL}/api/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentPath,
                        title: storyTitle,
                        author: storyAuthor,
                        cover: storyCover,
                        date: storyDate
                    })
                });
            } catch (error) {
                console.error("Failed to register like:", error);
                // Revert optimistic update if network fails
                hasLiked = false;
                localStorage.removeItem(storageKey);
                likeBtn.classList.remove('liked');
                likeCountEl.innerText = currentLikes;
            }
        });
    }

    // ==========================================================================
    // 5. Homepage Top Stats Loader (Most Viewed & Most Liked)
    // ==========================================================================
    const mostViewedContainer = document.getElementById('most-viewed-container');
    const mostLikedContainer = document.getElementById('most-liked-container');

    // Helper function to render a Post Card dynamically
    const renderPostCard = (post) => {
        const coverHtml = post.cover ? `<img src="${post.cover}" alt="جلد اثر: ${post.title}" class="post-cover" width="85" height="85" loading="lazy" decoding="async">` : '';
        const dateHtml = post.date ? `<time class="post-date">${post.date}</time>` : '';
        const authorHtml = post.author ? `<span class="post-author">${post.author}</span>` : '';
        
        return `
            <article class="post-card fade-in-up">
                <a href="${post.url}">
                    ${coverHtml}
                    <h3 class="post-title">${post.title}</h3>
                    ${authorHtml}
                    ${dateHtml}
                </a>
            </article>
        `;
    };

    if (mostViewedContainer && mostLikedContainer) {
        const loadHomepageStats = async () => {
            try {
                const response = await fetch(`${ASB_API_URL}/api/top`);
                if (!response.ok) throw new Error("Failed to fetch top stats");
                
                const stats = await response.json();
                
                // Render Most Viewed
                if (stats.topViews && stats.topViews.length > 0) {
                    mostViewedContainer.innerHTML = stats.topViews.map(renderPostCard).join('');
                } else {
                    mostViewedContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>هنوز آماری ثبت نشده است.</p></div>';
                }

                // Render Most Liked
                if (stats.topLikes && stats.topLikes.length > 0) {
                    mostLikedContainer.innerHTML = stats.topLikes.map(renderPostCard).join('');
                } else {
                    mostLikedContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>هنوز محبوبیتی ثبت نشده است.</p></div>';
                }

            } catch (error) {
                console.error("Error loading homepage stats:", error);
                const errorHtml = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>خطا در دریافت آمار. لطفاً دوباره تلاش کنید.</p></div>';
                mostViewedContainer.innerHTML = errorHtml;
                mostLikedContainer.innerHTML = errorHtml;
            }
        };

        loadHomepageStats();
    }
});
