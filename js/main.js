document.addEventListener('DOMContentLoaded', () => {

    // Global Constants
    const basePath = window.ASB_BASE_PATH || '';
    const ASB_API_URL = ""; // Your Cloudflare Worker URL (via Vercel Rewrite)

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
    // 4. Story Interactions (Unique Views & Two-Way Likes)
    // ==========================================================================
    const viewCountEl = document.getElementById('view-count');
    const likeCountEl = document.getElementById('like-count');
    const likeBtn = document.getElementById('like-btn');
    let currentPath = window.location.pathname
        .replace(/\/index\.html$/, '')
        .replace(/\.html$/, '')
        .replace(/\/$/, '');
        
    if (currentPath === '') currentPath = '/';
    
    if (viewCountEl && likeCountEl && likeBtn) {
        const storyTitle = document.querySelector('.story-title')?.innerText || "بدون عنوان";
        const storyAuthor = document.querySelector('.meta-author')?.innerText || "";
        const storyDate = document.querySelector('.meta-date time')?.innerText || "";
        const coverImg = document.querySelector('.story-cover');
        const storyCover = coverImg ? coverImg.src : "";

        const likeStorageKey = `liked_${currentPath}`;
        const viewStorageKey = `viewed_${currentPath}`;
        
        let hasLiked = localStorage.getItem(likeStorageKey) === 'true';
        let hasViewed = localStorage.getItem(viewStorageKey) === 'true';

        // Apply initial Like state
        if (hasLiked) {
            likeBtn.classList.add('liked');
            likeBtn.setAttribute('aria-label', 'لغو پسندیدن');
        }

        // Register View or just load stats
        const registerView = async () => {
            // If already viewed, just get stats. Otherwise, add a view.
            const actionType = hasViewed ? 'get_stats' : 'add_view';
            
            try {
                const response = await fetch(`${ASB_API_URL}/api/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentPath, title: storyTitle, author: storyAuthor, cover: storyCover, date: storyDate,
                        action: actionType
                    })
                });
                
                if (response.ok) {
                    const stats = await response.json();
                    viewCountEl.innerText = toPersianDigits(stats.views || 0);
                    likeCountEl.innerText = toPersianDigits(stats.likes || 0);
                    
                    if (actionType === 'add_view') {
                        localStorage.setItem(viewStorageKey, 'true');
                    }
                }
            } catch (error) {
                console.error("Failed to register view/fetch stats:", error);
                viewCountEl.innerText = "-";
                likeCountEl.innerText = "-";
            }
        };

        registerView();

        // Handle Two-Way Like Button Click
        likeBtn.addEventListener('click', async () => {
            const isCurrentlyLiked = likeBtn.classList.contains('liked');
            const action = isCurrentlyLiked ? 'unlike' : 'like';
            
            // 1. Optimistic UI Update (Instant visual feedback)
            if (action === 'like') {
                localStorage.setItem(likeStorageKey, 'true');
                likeBtn.classList.add('liked');
                likeBtn.setAttribute('aria-label', 'لغو پسندیدن');
            } else {
                localStorage.removeItem(likeStorageKey);
                likeBtn.classList.remove('liked');
                likeBtn.setAttribute('aria-label', 'پسندیدن این مطلب');
            }
            
            // Parse current persian likes to english, modify, then back to persian
            let currentLikesStr = likeCountEl.innerText;
            let currentLikesEng = currentLikesStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
            let currentLikes = parseInt(currentLikesEng) || 0;
            
            let newLikes = action === 'like' ? currentLikes + 1 : Math.max(0, currentLikes - 1);
            likeCountEl.innerText = toPersianDigits(newLikes);

            // 2. Send request to Cloudflare
            try {
                await fetch(`${ASB_API_URL}/api/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentPath, title: storyTitle, author: storyAuthor, cover: storyCover, date: storyDate,
                        action: action
                    })
                });
            } catch (error) {
                console.error("Failed to register like/unlike:", error);
                // Revert UI on failure
                if (action === 'like') {
                    localStorage.removeItem(likeStorageKey);
                    likeBtn.classList.remove('liked');
                } else {
                    localStorage.setItem(likeStorageKey, 'true');
                    likeBtn.classList.add('liked');
                }
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
        const coverHtml = post.cover ? `<img src="${post.cover}" alt="جلد اثر: ${post.title}" class="post-cover" loading="lazy" decoding="async">` : '';
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
                    mostViewedContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>هنوز آماری ثبت نشده‌است.</p></div>';
                }

                if (stats.topLikes && stats.topLikes.length > 0) {
                    mostLikedContainer.innerHTML = stats.topLikes.map(renderPostCard).join('');
                } else {
                    mostLikedContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>هنوز محبوبیتی ثبت نشده‌است.</p></div>';
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
    // 6. Advanced Interactive Comments System (Fetch, Submit, Delete & Nested)
    // ==========================================================================
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
    const commentStatusMsg = document.getElementById('comment-status');
    let currentReplyParentId = null;
    let currentReplyName = null;

    if (commentsList) {
        
        const getMyComments = () => {
            try { return JSON.parse(localStorage.getItem('asb_comments')) || []; } 
            catch (e) { return []; }
        };

        const deleteMyComment = async (commentId, token, btnEl) => {
            if (!confirm("آیا از حذف دیدگاه خود مطمئن هستید؟")) return;
            
            const originalText = btnEl.innerText;
            btnEl.innerText = "در حال حذف...";
            btnEl.disabled = true;

            try {
                const res = await fetch(`${ASB_API_URL}/api/comment/delete`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: currentPath, id: commentId, token: token })
                });

                if (res.ok) {
                    const cItem = document.getElementById(`comment-${commentId}`);
                    if (cItem) {
                        cItem.style.opacity = '0.3';
                        setTimeout(() => cItem.remove(), 500);
                    }
                    let myComs = getMyComments();
                    myComs = myComs.filter(c => c.id !== commentId);
                    localStorage.setItem('asb_comments', JSON.stringify(myComs));
                } else {
                    alert("خطا در حذف دیدگاه. ممکن است منقضی شده باشد.");
                    btnEl.innerText = originalText;
                    btnEl.disabled = false;
                }
            } catch (err) {
                alert("ارتباط با سرور برقرار نشد.");
                btnEl.innerText = originalText;
                btnEl.disabled = false;
            }
        };
        
        const renderCommentHtml = (comment, isReply = false) => {
            
            let officialRepliesHtml = '';
            if (comment.replies) {
                if (comment.replies.admin) {
                    officialRepliesHtml += `
                        <div class="comment-reply admin-reply">
                            <div class="reply-author"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> پاسخ نشر اسب</div>
                            <div class="comment-body">${escapeHTML(comment.replies.admin)}</div>
                        </div>`;
                }
                if (comment.replies.author) {
                    officialRepliesHtml += `
                        <div class="comment-reply author-reply">
                            <div class="reply-author"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg> پاسخ نویسنده‌ی اثر</div>
                            <div class="comment-body">${escapeHTML(comment.replies.author)}</div>
                        </div>`;
                }
                if (comment.replies.translator) {
                    officialRepliesHtml += `
                        <div class="comment-reply translator-reply">
                            <div class="reply-author"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> پاسخ مترجم اثر</div>
                            <div class="comment-body">${escapeHTML(comment.replies.translator)}</div>
                        </div>`;
                }
            }

            const myComments = getMyComments();
            const myComData = myComments.find(c => c.id === comment.id);
            const deleteBtnHtml = myComData ? `
                <button type="button" class="delete-own-comment-btn" data-id="${comment.id}" data-token="${myComData.token}" aria-label="حذف دیدگاه من" title="حذف این دیدگاه">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            ` : '';

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
                            <div style="display:flex; align-items:center; gap: 0.5rem;">
                                <span class="comment-author">${escapeHTML(comment.name)}</span>
                                ${deleteBtnHtml}
                            </div>
                            <span class="comment-date">${escapeHTML(comment.date)}</span>
                        </div>
                        ${replyButtonHtml}
                    </div>
                    <div class="comment-body">${escapeHTML(comment.text)}</div>
                    ${officialRepliesHtml}
                </div>
            `;
        };

        const loadComments = async () => {
            try {
                const response = await fetch(`${ASB_API_URL}/api/comments?url=${encodeURIComponent(currentPath)}`);
                if (!response.ok) throw new Error("Failed to load comments");
                
                const comments = await response.json();
                
                if (comments.length > 0) {
                    
                    const buildCommentTree = (allComments, parentId = null, depth = 0) => {
                        let html = '';
                        const children = allComments.filter(c => (c.parentId || null) === parentId);
                        
                        if (children.length > 0) {
                            if (depth > 0) html += `<div class="nested-comments-wrapper">`;
                            
                            children.forEach(child => {
                                html += renderCommentHtml(child, depth > 0);
                                html += buildCommentTree(allComments, child.id, depth + 1);
                            });
                            
                            if (depth > 0) html += `</div>`;
                        }
                        return html;
                    };

                    commentsList.innerHTML = buildCommentTree(comments, null, 0);

                    document.querySelectorAll('.reply-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            currentReplyParentId = btn.getAttribute('data-id');
                            currentReplyName = btn.getAttribute('data-name');
                            
                            let badge = document.getElementById('replying-badge');
                            if(!badge) {
                                badge = document.createElement('div');
                                badge.id = 'replying-badge';
                                badge.className = 'replying-badge';
                                commentForm.parentNode.insertBefore(badge, commentForm);
                            }
                            badge.innerHTML = `در حال پاسخ به: <strong>${currentReplyName}</strong> <button type="button" id="cancel-reply">لغو</button>`;
                            
                            document.getElementById('cancel-reply').addEventListener('click', () => {
                                currentReplyParentId = null;
                                currentReplyName = null;
                                badge.remove();
                            });

                            const textInput = document.getElementById('comment-text');
                            textInput.focus();
                            textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                    });

                    document.querySelectorAll('.delete-own-comment-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const cId = btn.getAttribute('data-id');
                            const cToken = btn.getAttribute('data-token');
                            deleteMyComment(cId, cToken, btn);
                        });
                    });

                } else {
                    commentsList.innerHTML = '<div class="empty-state" style="padding: 1.5rem; font-size: 0.95rem;">هنوز دیدگاهی برای این مطلب ثبت نشده‌است. اولین نفر باشید!</div>';
                }
            } catch (error) {
                console.error("Error loading comments:", error);
                commentsList.innerHTML = '<div class="empty-state" style="padding: 1.5rem; font-size: 0.95rem;">خطا در دریافت نظرات.</div>';
            }
        };
        
        loadComments();

        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault(); 
                
                const submitBtn = commentForm.querySelector('button[type="submit"]');
                const nameInput = document.getElementById('comment-name');
                const textInput = document.getElementById('comment-text');
                
                const nameVal = nameInput.value.trim();
                const textVal = textInput.value.trim();
                
                if (!nameVal || !textVal) return;

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
                            parentId: currentReplyParentId 
                        })
                    });

                    if (!response.ok) throw new Error("Failed to send comment");
                    const resData = await response.json();

                    if (resData.success && resData.deleteToken && resData.id) {
                        let myComs = getMyComments();
                        myComs.push({ id: resData.id, token: resData.deleteToken });
                        localStorage.setItem('asb_comments', JSON.stringify(myComs));
                    }

                    commentStatusMsg.innerText = 'دیدگاه شما با موفقیت ارسال شد و پس از تأیید نمایش داده می‌شود.';
                    commentStatusMsg.classList.add('success');
                    commentForm.reset();
                    
                    currentReplyParentId = null;
                    const badge = document.getElementById('replying-badge');
                    if(badge) badge.remove();

                } catch (error) {
                    console.error("Error sending comment:", error);
                    commentStatusMsg.innerText = 'خطا در ارسال دیدگاه. لطفاً اتصال اینترنت را بررسی کنید.';
                    commentStatusMsg.classList.add('error');
                } finally {
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

    // ==========================================================================
    // 7. Lightbox System for Story Cover
    // ==========================================================================
    const lightboxTrigger = document.querySelector('.lightbox-trigger');
    if (lightboxTrigger) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Full screen image view');
        
        const img = document.createElement('img');
        img.className = 'lightbox-img';
        img.src = lightboxTrigger.src;
        img.alt = lightboxTrigger.alt;
        
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        
        lightboxTrigger.addEventListener('click', () => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; 
        });
        
        overlay.addEventListener('click', () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

});
