(function () {
    'use strict';

    let searchQuery = '';

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderPaths(paths) {
        if (!paths || !paths.length) return '<span class="artifact-muted">-</span>';
        return paths
            .map(
                (p) => `
            <div class="path-row">
                <code class="artifact-path">${escapeHtml(p)}</code>
                <button class="copy-btn copy-sm" data-copy-text="${escapeHtml(p)}" aria-label="Copy path">
                    <i class="fas fa-copy"></i>
                </button>
            </div>`
            )
            .join('');
    }

    function renderArtifact(artifact, categoryId) {
        const searchText = [
            artifact.name,
            artifact.description,
            ...(artifact.paths || []),
            artifact.registry,
            artifact.parser,
            artifact.notes,
            artifact.tier,
            categoryId,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const isCore = artifact.tier === 'core';
        const badge = isCore
            ? '<span class="artifact-badge core" title="High-frequency DFIR artifact">core</span>'
            : '';

        return `
            <article class="artifact-card${isCore ? ' is-core' : ''}" data-search="${escapeHtml(searchText)}" data-tier="${isCore ? 'core' : 'ref'}">
                <div class="artifact-header">
                    <h3>${escapeHtml(artifact.name)}</h3>
                    <div class="artifact-badges">
                        ${badge}
                        <span class="artifact-tag">${escapeHtml(categoryId)}</span>
                    </div>
                </div>
                <p class="artifact-desc">${escapeHtml(artifact.description)}</p>
                <div class="artifact-fields">
                    <div class="artifact-field">
                        <span class="field-label"><i class="fas fa-folder-open"></i> Location</span>
                        <div class="field-value paths-list">${renderPaths(artifact.paths)}</div>
                    </div>
                    ${
                        artifact.registry
                            ? `<div class="artifact-field">
                        <span class="field-label"><i class="fas fa-key"></i> Registry</span>
                        <div class="field-value">
                            <div class="path-row">
                                <code class="artifact-path">${escapeHtml(artifact.registry)}</code>
                                <button class="copy-btn copy-sm" data-copy-text="${escapeHtml(artifact.registry)}" aria-label="Copy registry key">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>`
                            : ''
                    }
                    ${
                        artifact.parser
                            ? `<div class="artifact-field">
                        <span class="field-label"><i class="fas fa-wrench"></i> Parser / Tool</span>
                        <div class="field-value"><span class="artifact-parser">${escapeHtml(artifact.parser)}</span></div>
                    </div>`
                            : ''
                    }
                    ${
                        artifact.notes
                            ? `<div class="artifact-field notes">
                        <span class="field-label"><i class="fas fa-info-circle"></i> Notes</span>
                        <div class="field-value"><span class="artifact-notes">${escapeHtml(artifact.notes)}</span></div>
                    </div>`
                            : ''
                    }
                </div>
            </article>`;
    }

    function renderSection(cat) {
        const isOpen = cat.defaultOpen ? 'open' : '';
        const expanded = cat.defaultOpen ? 'true' : 'false';
        const count = cat.artifacts.length;
        const coreCount = cat.artifacts.filter((a) => a.tier === 'core').length;

        return `
            <section class="tool-section artifact-section ${isOpen}" id="${cat.id}" data-section="${cat.id}">
                <button class="tool-section-toggle" aria-expanded="${expanded}" aria-controls="${cat.id}-body">
                    <span class="tool-section-chevron" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>
                    <span class="tool-section-icon"><i class="fas ${cat.icon}"></i></span>
                    <span class="tool-section-title">${escapeHtml(cat.title)}</span>
                    ${coreCount ? `<span class="tool-section-core-count" title="Core artifacts">${coreCount} core</span>` : ''}
                    <span class="tool-section-count">${count}</span>
                </button>
                <div class="tool-section-body" id="${cat.id}-body">
                    <div class="artifacts-grid">
                        ${cat.artifacts.map((a) => renderArtifact(a, cat.id)).join('')}
                    </div>
                </div>
            </section>`;
    }

    function render() {
        const data = window.GHOST_ARTIFACTS;
        const container = document.getElementById('artifacts-content');
        const nav = document.getElementById('section-nav');

        container.innerHTML = data.map((cat) => renderSection(cat)).join('');

        nav.innerHTML = data
            .map(
                (cat) =>
                    `<a href="#${cat.id}" class="section-pill" data-section-target="${cat.id}">${escapeHtml(cat.title)}</a>`
            )
            .join('');

        bindSectionToggles();
        bindSectionNav();
        bindCopyButtons();
        applySearch();
    }

    function bindSectionToggles() {
        document.querySelectorAll('.tool-section-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const section = btn.closest('.tool-section');
                const isOpen = section.classList.toggle('open');
                btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });
        });
    }

    function bindSectionNav() {
        document.querySelectorAll('#section-nav .section-pill').forEach((pill) => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(pill.dataset.sectionTarget);
                if (!target) return;
                target.classList.add('open');
                target.querySelector('.tool-section-toggle')?.setAttribute('aria-expanded', 'true');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    function bindCopyButtons() {
        document.querySelectorAll('[data-copy-text]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(btn.dataset.copyText);
                    btn.classList.add('copied');
                    showNotification('Copied to clipboard');
                    setTimeout(() => btn.classList.remove('copied'), 500);
                } catch {
                    showNotification('Failed to copy', true);
                }
            });
        });
    }

    function showNotification(message, isError = false) {
        const n = document.getElementById('notification');
        n.querySelector('span').textContent = message;
        n.classList.toggle('error', isError);
        n.classList.add('show');
        setTimeout(() => n.classList.remove('show'), 2000);
    }

    function applySearch() {
        const q = searchQuery.toLowerCase().trim();
        let visible = 0;

        document.querySelectorAll('.artifact-section').forEach((section) => {
            let sectionVisible = 0;

            section.querySelectorAll('.artifact-card').forEach((card) => {
                const match = !q || card.dataset.search.includes(q);
                card.classList.toggle('hidden', !match);
                if (match) {
                    visible++;
                    sectionVisible++;
                }
            });

            // Auto-open matching sections while searching
            if (q && sectionVisible > 0) {
                section.classList.add('open');
                section.querySelector('.tool-section-toggle')?.setAttribute('aria-expanded', 'true');
            }

            section.classList.toggle('section-hidden', sectionVisible === 0 && !!q);
        });

        let noResults = document.getElementById('no-results');
        if (visible === 0 && q) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'no-results';
                noResults.className = 'no-results';
                noResults.innerHTML = '<i class="fas fa-search"></i> No artifacts match your search';
                document.getElementById('artifacts-content').appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        render();

        document.getElementById('search-input').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applySearch();
        });
    });
})();
