(function () {
    'use strict';

    let offsecData = [];
    let dfirData = [];
    let kqlData = [];
    let commandTemplates = {};
    let activeTab = 'offsec';
    let searchQuery = '';

    function sortCategories(data) {
        return [...data].sort((a, b) => {
            const orderA = a.order ?? 999;
            const orderB = b.order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.title.localeCompare(b.title);
        });
    }

    const iconMap = {
        nmap: 'fa-network-wired',
        nuclei: 'fa-radiation',
        'web-recon': 'fa-spider',
        'full-scans': 'fa-layer-group',
        gobuster: 'fa-folder-open',
        subdomain: 'fa-sitemap',
        urls: 'fa-link',
        sensitive: 'fa-eye',
        xss: 'fa-code',
        lfi: 'fa-file-code',
        cors: 'fa-globe',
        ffuf: 'fa-bolt',
        wordpress: 'fa-wordpress',
        parameters: 'fa-cogs',
        javascript: 'fa-js',
        shodan: 'fa-search',
        device: 'fa-desktop',
        identity: 'fa-user-shield',
        email: 'fa-envelope',
        hunting: 'fa-crosshairs',
    };

    const toolsRef = [
        { name: 'Volatility 3', desc: 'Memory forensics framework', url: 'https://github.com/volatilityfoundation/volatility3' },
        { name: 'KAPE', desc: 'Kroll Artifact Parser and Extractor', url: 'https://www.kroll.com/en/services/cyber-risk/incident-response-litigation-support/kroll-artifact-parser-extractor-kape' },
        { name: 'Velociraptor', desc: 'Endpoint visibility and collection', url: 'https://github.com/Velocidex/velociraptor' },
        { name: 'Eric Zimmerman Tools', desc: 'MFTECmd, PECmd, EvtxECmd, and more', url: 'https://ericzimmerman.github.io/' },
        { name: 'Nuclei', desc: 'Template-based vulnerability scanner', url: 'https://github.com/projectdiscovery/nuclei' },
        { name: 'Gobuster', desc: 'Directory, vhost, and DNS brute forcing', url: 'https://github.com/OJ/gobuster' },
        { name: 'Nmap', desc: 'Network discovery and security auditing', url: 'https://nmap.org/' },
        { name: 'FFuF', desc: 'Fast web fuzzer', url: 'https://github.com/ffuf/ffuf' },
        { name: 'Subfinder', desc: 'Subdomain discovery', url: 'https://github.com/projectdiscovery/subfinder' },
        { name: 'Burp Suite', desc: 'Web application security testing', url: 'https://portswigger.net/burp' },
        { name: 'Wireshark', desc: 'Network protocol analyzer', url: 'https://www.wireshark.org/' },
        { name: 'YARA', desc: 'Pattern matching for malware', url: 'https://github.com/VirusTotal/yara' },
        { name: 'Autopsy', desc: 'Digital forensics platform', url: 'https://www.autopsy.com/' },
        { name: 'Chainsaw', desc: 'Sigma-powered EVTX hunting', url: 'https://github.com/WithSecure/chainsaw' },
        { name: 'Kusto / KQL', desc: 'Microsoft Sentinel & Defender query language', url: 'https://learn.microsoft.com/en-us/kusto/query/' },
    ];

    async function loadData() {
        if (window.GHOST_DATA) {
            offsecData = window.GHOST_DATA.offsec;
            dfirData = window.GHOST_DATA.dfir;
            kqlData = window.GHOST_DATA.kql || [];
            return;
        }
        const [offsecRes, dfirRes, kqlRes] = await Promise.all([
            fetch('js/offsec-commands.json'),
            fetch('js/dfir-commands.json'),
            fetch('js/kql-commands.json'),
        ]);
        offsecData = await offsecRes.json();
        dfirData = await dfirRes.json();
        kqlData = await kqlRes.json();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderCommandCard(cmd, section) {
        const id = `${section}-${cmd.id}`;
        commandTemplates[id] = cmd.command;
        const isKql = section.startsWith('kql');
        const boxClass = isKql ? 'terminal-box kql-box' : 'terminal-box';
        const promptClass = isKql ? 'prompt kql-prompt' : 'prompt';
        return `
            <div class="tool-card" data-search="${escapeHtml((cmd.title + ' ' + cmd.description + ' ' + cmd.command).toLowerCase())}">
                <div class="tool-header">
                    <h3>${escapeHtml(cmd.title)}</h3>
                    <button class="copy-btn" data-copy="${id}" aria-label="Copy command">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="tool-description">${escapeHtml(cmd.description)}</div>
                <div class="${boxClass}">
                    <span class="${promptClass}" aria-hidden="true"></span>
                    <span class="command" id="${id}">${escapeHtml(cmd.command)}</span>
                </div>
            </div>`;
    }

    function renderSection(category, section) {
        const icon = category.icon || iconMap[category.id] || 'fa-terminal';
        const cards = category.commands.map((c) => renderCommandCard(c, section)).join('');
        const sectionId = `${section}-${category.id}`;
        const isOpen = category.defaultOpen ? 'open' : '';
        const expanded = category.defaultOpen ? 'true' : 'false';

        return `
            <section class="tool-section ${isOpen}" id="${sectionId}" data-section="${sectionId}">
                <button class="tool-section-toggle" aria-expanded="${expanded}" aria-controls="${sectionId}-body">
                    <span class="tool-section-chevron" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>
                    <span class="tool-section-icon"><i class="fas ${icon}"></i></span>
                    <span class="tool-section-title">${escapeHtml(category.title)}</span>
                    <span class="tool-section-count">${category.commands.length}</span>
                </button>
                <div class="tool-section-body" id="${sectionId}-body">
                    <div class="tools-container">
                        ${cards}
                    </div>
                </div>
            </section>`;
    }

    function renderPanels() {
        document.getElementById('offsec-panel').innerHTML = sortCategories(offsecData)
            .map((c) => renderSection(c, 'offsec'))
            .join('');
        document.getElementById('dfir-panel').innerHTML = sortCategories(dfirData)
            .map((c) => renderSection(c, 'dfir'))
            .join('');
        document.getElementById('kql-panel').innerHTML = sortCategories(kqlData)
            .map((c) => renderSection(c, 'kql'))
            .join('');

        renderSectionNav();
        renderToolsRef();
        bindCopyButtons();
        bindSectionToggles();
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

    function getActiveData() {
        if (activeTab === 'offsec') return sortCategories(offsecData);
        if (activeTab === 'dfir') return sortCategories(dfirData);
        if (activeTab === 'kql') return sortCategories(kqlData);
        return [];
    }

    function renderSectionNav() {
        const nav = document.getElementById('section-nav');
        const data = getActiveData();
        nav.innerHTML = data
            .map(
                (c) =>
                    `<a href="#${activeTab}-${c.id}" class="section-pill" data-section-target="${activeTab}-${c.id}">${escapeHtml(c.title)}</a>`
            )
            .join('');

        nav.querySelectorAll('.section-pill').forEach((pill) => {
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

    function renderToolsRef() {
        const grid = document.getElementById('tools-ref-grid');
        grid.innerHTML = toolsRef
            .map(
                (t) => `
            <div class="tool-ref-card">
                <h3>${escapeHtml(t.name)}</h3>
                <p>${escapeHtml(t.desc)}</p>
                <a href="${t.url}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-external-link-alt"></i> View
                </a>
            </div>`
            )
            .join('');
    }

    function bindCopyButtons() {
        document.querySelectorAll('.copy-btn[data-copy]').forEach((btn) => {
            btn.addEventListener('click', () => copyCommand(btn.dataset.copy, btn));
        });
    }

    function fixCommandSpacing(text) {
        return text
            .replace(/\s{2,}/g, ' ')
            .replace(/([^\s\n])(cat|echo|grep|sed|awk|cut|sort|uniq|tee|xargs|curl)\s/g, '$1 $2 ')
            .replace(/([^\s\n])\|([^\s\n])/g, '$1 | $2')
            .replace(/([^\s\n])(\>|\>\>)/g, '$1 $2')
            .trim();
    }

    async function copyCommand(id, btn) {
        const el = document.getElementById(id);
        if (!el) return;
        const text = id.startsWith('kql-') ? el.textContent : fixCommandSpacing(el.textContent);
        try {
            await navigator.clipboard.writeText(text);
            if (btn) {
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 500);
            }
            showNotification('Copied to clipboard');
        } catch {
            showNotification('Failed to copy', true);
        }
    }

    function showNotification(message, isError = false) {
        const n = document.getElementById('notification');
        n.querySelector('span').textContent = message;
        n.classList.toggle('error', isError);
        n.classList.add('show');
        setTimeout(() => n.classList.remove('show'), 2000);
    }

    function updateDomain(domain) {
        document.querySelectorAll('#offsec-panel .command').forEach((el) => {
            const template = commandTemplates[el.id];
            if (!template) return;
            el.textContent = template.replace(/example\.com/g, domain);
        });
        showNotification(`OffSec commands updated for: ${domain}`);
    }

    function applySearch() {
        const q = searchQuery.toLowerCase().trim();
        const panel = document.getElementById(`${activeTab}-panel`);
        if (!panel) return;

        let visible = 0;

        panel.querySelectorAll('.tool-section').forEach((section) => {
            let sectionVisible = 0;
            section.querySelectorAll('.tool-card').forEach((card) => {
                const match = !q || card.dataset.search.includes(q);
                card.classList.toggle('hidden', !match);
                if (match) {
                    visible++;
                    sectionVisible++;
                }
            });

            if (q && sectionVisible > 0) {
                section.classList.add('open');
                section.querySelector('.tool-section-toggle')?.setAttribute('aria-expanded', 'true');
            }

            section.classList.toggle('section-hidden', sectionVisible === 0 && !!q);
        });

        let noResults = panel.querySelector('.no-results');
        if (visible === 0 && q) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.innerHTML = '<i class="fas fa-search"></i> No commands match your search';
                panel.appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    function switchTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.tab-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        document.querySelectorAll('.panel').forEach((p) => {
            p.classList.toggle('active', p.id === `${tab}-panel`);
        });
        document.getElementById('domain-form').style.display = tab === 'offsec' ? '' : 'none';
        document.getElementById('section-nav').style.display = tab === 'tools' ? 'none' : '';
        renderSectionNav();
        applySearch();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await loadData();
            renderPanels();
        } catch (err) {
            console.error(err);
            document.getElementById('offsec-panel').innerHTML =
                '<div class="no-results">Failed to load command data. Serve via a local web server or check js/data.js.</div>';
        }

        document.getElementById('domain-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const domain = document.getElementById('domain-input').value.trim();
            if (domain) updateDomain(domain);
        });

        document.getElementById('search-input').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applySearch();
        });

        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    });
})();