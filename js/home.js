(function () {
    'use strict';

    const { escapeHtml, formatDate } = window.GhostCommon;

    function renderSummaryCard(writeup) {
        return `
            <article class="writeup-card summary-card">
                <div class="writeup-card-header">
                    <span class="writeup-category">${escapeHtml(writeup.category)}</span>
                    <div class="writeup-meta">
                        <span><i class="far fa-calendar-alt"></i> ${formatDate(writeup.date)}</span>
                        <span><i class="far fa-clock"></i> ${escapeHtml(writeup.readTime)}</span>
                    </div>
                </div>
                <h3><a href="writeups.html#${escapeHtml(writeup.id)}">${escapeHtml(writeup.title)}</a></h3>
                <p class="writeup-excerpt">${escapeHtml(writeup.summary)}</p>
                <a href="writeups.html#${escapeHtml(writeup.id)}" class="read-more">
                    Read more <i class="fas fa-arrow-right"></i>
                </a>
            </article>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('blog-summaries');
        const writeups = [...window.GHOST_WRITEUPS].sort((a, b) => b.date.localeCompare(a.date));

        if (!writeups.length) {
            container.innerHTML =
                '<div class="no-results"><i class="fas fa-pen-nib"></i> No writeups yet — check back soon.</div>';
            return;
        }

        container.innerHTML = writeups.slice(0, 4).map(renderSummaryCard).join('');
    });
})();