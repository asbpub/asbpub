document.addEventListener('DOMContentLoaded', () => {

    // Global Constants
    const basePath = window.ASB_BASE_PATH || '';
    const ASB_API_URL = "https://asbpub-forms.asbpub-official.workers.dev"; // Your Cloudflare Worker URL

    // Helper: Security function to prevent XSS attacks in comments
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    };

    // Helper: Convert English Digits to beautiful Persian Digits
    const toPersianDigits = (num) => {
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, x => farsiDigits[x]);
    };

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
    const currentPath = window.location.pathname; 
    
    if (viewCountEl && likeCountEl && likeBtn) {
        const storyTitle = document.querySelector('.story-title')?.innerText || "بدون عنوان";
        const storyAuthor = document.querySelector('.meta-author')?.innerText || "";
        const storyDate = document.querySelector('.meta-date time')?.innerText || "";
        const coverImg = document.querySelector('.story-cover');
        const storyCover = coverImg ? coverImg.src : "";

        const storageKey = `liked_${currentPath}`;
        let hasLiked = localStorage.getItem(storageKey) === 'true';

        if (hasLiked) {
            likeBtn.classList.add('liked');
            likeBtn.setAttribute('aria-label', 'شما این مطلب را پسندیده‌اید');
        }

        const registerView = async () => {
            try {
                const response = await fetch(`${ASB_API_URL}/api/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentPath, title: storyTitle, author: storyAuthor, cover: storyCover, date: storyDate
                    })
                });
                
                if (response.ok) {
                    const stats = await response.json();
                    viewCountEl.innerText = toPersianDigits(stats.views || 0);
                    likeCountEl.innerText = toPersianDigits(stats.likes || 0);
                }
            } catch (error) {
                console.error("Failed to register view/fetch stats:", error);
                viewCountEl.innerText = "-";
                likeCountEl.innerText = "-";
            }
        };

        registerView();

        likeBtn.addEventListener('click', async () => {
            if (hasLiked) return; 
            
            hasLiked = true;
            localStorage.setItem(storageKey, 'true');
            likeBtn.classList.add('liked');
            likeBtn.setAttribute('aria-label', 'شما این مطلب را پسندیده‌اید');
            
            // Convert current Persian string back to int for addition, then format back
            let currentLikesStr = likeCountEl.innerText;
            let currentLikesEng = currentLikesStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
            let currentLikes = parseInt(currentLikesEng) || 0;
            
            likeCountEl.innerText = toPersianDigits(currentLikes + 1);

            try {
                await fetch(`${ASB_API_URL}/api/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentPath, title: storyTitle, author: storyAuthor, cover: storyCover, date: storyDate
                    })
                });
            } catch (error) {
                console.error("Failed to register like:", error);
                hasLiked = false;
                localStorage.removeItem(storageKey);
                likeBtn.classList.remove('liked');
                likeCountEl.innerText = toPersianDigits(currentLikes);
            }
        });
    }

    // ==========================================================================
    // 5. Homepage Top Stats Loader (Most Viewed & Most Liked)
    // ==========================================================================
    const mostViewedContainer = document.getElementById('most-viewed-container');
    const mostLikedContainer = document.getElementById('most-liked-container');

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
                
                if (stats.topViews && stats.topViews.length > 0) {
                    mostViewedContainer.innerHTML = stats.topViews.map(renderPostCard).join('');
                } else {
                    mostViewedContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>هنوز آماری ثبت نشده است.</p></div>';
                }

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

    // ==========================================================================
    // 6. Interactive Comments System (Fetch, Submit & Nested Replies)
    // ==========================================================================
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
    const commentStatusMsg = document.getElementById('comment-status');
    let currentReplyParentId = null;
    let currentReplyName = null;

    if (commentsList) {
        
        // Helper to render a single comment block
        const renderCommentHtml = (comment, isReply = false) => {
            const adminReplyHtml = comment.admin_reply ? `
                <div class="comment-reply">
                    <div class="reply-author">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        پاسخ نشر اسب
                    </div>
                    <div class="comment-body">${escapeHTML(comment.admin_reply)}</div>
                </div>
            ` : '';

            // Only root comments get a reply button
            const replyButtonHtml = !isReply ? `
                <button type="button" class="reply-btn" data-id="${comment.id}" data-name="${escapeHTML(comment.name)}" aria-label="پاسخ به ${escapeHTML(comment.name)}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
                    پاسخ
                </button>
            ` : '';

            return `
                <div class="comment-item fade-in-up ${isReply ? 'nested-comment' : ''}" id="comment-${comment.id}">
                    <div class="comment-header">
                        <div class="comment-meta">
                            <span class="comment-author">${escapeHTML(comment.name)}</span>
                            <span class="comment-date">${escapeHTML(comment.date)}</span>
                        </div>
                        ${replyButtonHtml}
                    </div>
                    <div class="comment-body">${escapeHTML(comment.text)}</div>
                    ${adminReplyHtml}
                </div>
            `;
        };

        const loadComments = async () => {
            try {
                const response = await fetch(`${ASB_API_URL}/api/comments?url=${encodeURIComponent(currentPath)}`);
                if (!response.ok) throw new Error("Failed to load comments");
                
                const comments = await response.json();
                
                if (comments.length > 0) {
                    // Separate roots and nested replies
                    const rootComments = comments.filter(c => !c.parentId);
                    const childComments = comments.filter(c => c.parentId);

                    let commentsHtml = '';
                    rootComments.forEach(root => {
                        commentsHtml += renderCommentHtml(root, false);
                        
                        // Check if this root comment has any replies
                        const children = childComments.filter(c => c.parentId === root.id);
                        if (children.length > 0) {
                            commentsHtml += `<div class="nested-comments-wrapper">`;
                            children.forEach(child => {
                                commentsHtml += renderCommentHtml(child, true);
                            });
                            commentsHtml += `</div>`;
                        }
                    });

                    commentsList.innerHTML = commentsHtml;

                    // Attach click listeners to "Reply" buttons
                    document.querySelectorAll('.reply-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            currentReplyParentId = btn.getAttribute('data-id');
                            currentReplyName = btn.getAttribute('data-name');
                            
                            // Create or update the UI badge above the form
                            let badge = document.getElementById('replying-badge');
                            if(!badge) {
                                badge = document.createElement('div');
                                badge.id = 'replying-badge';
                                badge.className = 'replying-badge';
                                commentForm.parentNode.insertBefore(badge, commentForm);
                            }
                            badge.innerHTML = `در حال پاسخ به: <strong>${currentReplyName}</strong> <button type="button" id="cancel-reply">لغو</button>`;
                            
                            // Cancel reply listener
                            document.getElementById('cancel-reply').addEventListener('click', () => {
                                currentReplyParentId = null;
                                currentReplyName = null;
                                badge.remove();
                            });

                            // Smooth scroll and focus to the text area
                            const textInput = document.getElementById('comment-text');
                            textInput.focus();
                            textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                    });

                } else {
                    commentsList.innerHTML = '<div class="empty-state" style="padding: 1.5rem; font-size: 0.95rem;">هنوز دیدگاهی برای این مطلب ثبت نشده است. اولین نفر باشید!</div>';
                }
            } catch (error) {
                console.error("Error loading comments:", error);
                commentsList.innerHTML = '<div class="empty-state" style="padding: 1.5rem; font-size: 0.95rem;">خطا در دریافت نظرات.</div>';
            }
        };

        loadComments();

        // Handle Comment Form Submission
        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault(); 
                
                const submitBtn = commentForm.querySelector('button[type="submit"]');
                const nameInput = document.getElementById('comment-name');
                const textInput = document.getElementById('comment-text');
                
                const nameVal = nameInput.value.trim();
                const textVal = textInput.value.trim();
                
                if (!nameVal || !textVal) return;

                // UI Loading State
                submitBtn.disabled = true;
                submitBtn.innerText = 'در حال ارسال...';
                submitBtn.style.opacity = '0.7';
                commentStatusMsg.className = 'comment-status-msg'; 
                commentStatusMsg.innerText = '';

                try {
                    const response = await fetch(`${ASB_API_URL}/api/comment/add`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: currentPath,
                            name: nameVal,
                            text: textVal,
                            parentId: currentReplyParentId // Send the parent ID if it's a reply
                        })
                    });

                    if (!response.ok) throw new Error("Failed to send comment");

                    // Success UI
                    commentStatusMsg.innerText = 'دیدگاه شما با موفقیت ارسال شد و پس از تأیید نمایش داده می‌شود.';
                    commentStatusMsg.classList.add('success');
                    commentForm.reset();
                    
                    // Reset Reply State
                    currentReplyParentId = null;
                    const badge = document.getElementById('replying-badge');
                    if(badge) badge.remove();

                } catch (error) {
                    console.error("Error sending comment:", error);
                    commentStatusMsg.innerText = 'خطا در ارسال دیدگاه. لطفاً اتصال اینترنت را بررسی کنید.';
                    commentStatusMsg.classList.add('error');
                } finally {
                    // Reset Button State
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'ثبت دیدگاه';
                    submitBtn.style.opacity = '1';
                    
                    setTimeout(() => {
                        commentStatusMsg.classList.remove('success', 'error');
                        commentStatusMsg.innerText = '';
                    }, 6000);
                }
            });
        }
    }
});
