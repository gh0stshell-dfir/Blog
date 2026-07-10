(function () {
    'use strict';

    const { escapeHtml, formatDate } = window.GhostCommon;
    let searchQuery = '';
    let activeTag = 'all';

    function renderTags(tags, clickable = false) {
        return tags
            .map((tag) => {
                const cls = clickable ? 'writeup-tag filter-tag' : 'writeup-tag';
                const data = clickable ? ` data-tag="${escapeHtml(tag)}"` : '';
                return `<span class="${cls}"${data}>#${escapeHtml(tag)}</span>`;
            })
            .join('');
    }

    function renderCard(writeup, featured = false) {
        const cls = featured ? 'writeup-card featured' : 'writeup-card';
        return `
            <article class="${cls}" data-search="${escapeHtml((writeup.title + writeup.summary + writeup.tags.join(' ')).toLowerCase())}" data-tags="${escapeHtml(writeup.tags.join(','))}">
                <div class="writeup-card-header">
                    <span class="writeup-category">${escapeHtml(writeup.category)}</span>
                    <div class="writeup-meta">
                        <span><i class="far fa-calendar-alt"></i> ${formatDate(writeup.date)}</span>
                        <span><i class="far fa-clock"></i> ${escapeHtml(writeup.readTime)}</span>
                    </div>
                </div>
                <h3><a href="writeups.html#${escapeHtml(writeup.id)}">${escapeHtml(writeup.title)}</a></h3>
                <p class="writeup-summary">${escapeHtml(writeup.summary)}</p>
                <div class="writeup-tags">${renderTags(writeup.tags)}</div>
                <a href="writeups.html#${escapeHtml(writeup.id)}" class="read-more">
                    Read writeup <i class="fas fa-arrow-right"></i>
                </a>
            </article>`;
    }

    function renderList() {
        const grid = document.getElementById('writeups-grid');
        const data = window.GHOST_WRITEUPS;

        if (!data.length) {
            grid.innerHTML =
                '<div class="no-results"><i class="fas fa-pen-nib"></i> No writeups yet — check back soon.</div>';
            return;
        }

        grid.innerHTML = data.map((w) => renderCard(w)).join('');
        applyFilters();
    }

    function renderDetail(id) {
        const writeup = window.GHOST_WRITEUPS.find((w) => w.id === id);
        const listView = document.getElementById('writeups-list-view');
        const detailView = document.getElementById('writeup-detail-view');

        if (!writeup) {
            listView.style.display = '';
            detailView.style.display = 'none';
            return;
        }

        listView.style.display = 'none';
        detailView.style.display = 'block';
        detailView.innerHTML = `
            <a href="writeups.html" class="back-link" id="back-to-list">
                <i class="fas fa-arrow-left"></i> All writeups
            </a>
            <article class="writeup-article">
                <div class="writeup-card-header">
                    <span class="writeup-category">${escapeHtml(writeup.category)}</span>
                    <div class="writeup-meta">
                        <span><i class="far fa-calendar-alt"></i> ${formatDate(writeup.date)}</span>
                        <span><i class="far fa-clock"></i> ${escapeHtml(writeup.readTime)}</span>
                    </div>
                </div>
                <h1>${escapeHtml(writeup.title)}</h1>
                <div class="writeup-tags">${renderTags(writeup.tags)}</div>
                <div class="writeup-body">${writeup.content}</div>
            </article>`;

        document.getElementById('back-to-list').addEventListener('click', (e) => {
            e.preventDefault();
            history.pushState('', '', 'writeups.html');
            showList();
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showList() {
        document.getElementById('writeups-list-view').style.display = '';
        document.getElementById('writeup-detail-view').style.display = 'none';
    }

    function bindTagFilters() {
        document.querySelectorAll('#tag-filters .filter-tag').forEach((tag) => {
            tag.addEventListener('click', () => {
                activeTag = tag.dataset.tag;
                document.querySelectorAll('#tag-filters .filter-tag').forEach((t) => t.classList.remove('active'));
                tag.classList.add('active');
                applyFilters();
            });
        });
    }

    function applyFilters() {
        const q = searchQuery.toLowerCase().trim();
        let visible = 0;

        document.querySelectorAll('#writeups-grid .writeup-card').forEach((card) => {
            const tags = card.dataset.tags.split(',');
            const tagMatch = activeTag === 'all' || tags.includes(activeTag);
            const searchMatch = !q || card.dataset.search.includes(q);
            const show = tagMatch && searchMatch;
            card.classList.toggle('hidden', !show);
            if (show) visible++;
        });

        let noResults = document.getElementById('no-writeups');
        if (visible === 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'no-writeups';
                noResults.className = 'no-results';
                noResults.innerHTML = '<i class="fas fa-search"></i> No writeups match your filters';
                document.getElementById('writeups-grid').appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    function renderTagFilters() {
        const container = document.getElementById('tag-filters');
        if (!window.GHOST_WRITEUPS.length) {
            container.innerHTML = '';
            return;
        }

        const allTags = [...new Set(window.GHOST_WRITEUPS.flatMap((w) => w.tags))].sort();
        container.innerHTML =
            '<button class="filter-tag active" data-tag="all">All</button>' +
            allTags.map((t) => `<button class="filter-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join('');
    }

    function handleRoute() {
        const hash = location.hash.replace('#', '');
        if (hash) {
            renderDetail(hash);
        } else {
            showList();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderTagFilters();
        bindTagFilters();
        renderList();
        handleRoute();

        document.getElementById('search-input').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applyFilters();
        });

        window.addEventListener('hashchange', handleRoute);
    });
})();