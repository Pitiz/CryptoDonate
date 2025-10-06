class CryptoDonateElement extends HTMLElement {
    connectedCallback() {
        this.style.display = 'contents'; // The custom element itself shouldn't be visible
        this.classList.add('cryptodonate-loaded'); // Show the element now that it's being processed
        this.renderTrigger();
        this.renderModal();
    }

    renderTrigger() {
        const trigger = document.createElement('button');
        trigger.className = 'cryptodonate-trigger';
        trigger.setAttribute('aria-label', 'Open crypto donation widget');
        
        const accentColor = this.getAttribute('data-accent');
        if (accentColor) {
            trigger.style.setProperty('--crypto-donate-accent', accentColor);
        }

        const foregroundColor = this.getAttribute('data-foreground');
        if (foregroundColor) {
            trigger.setAttribute('data-foreground', foregroundColor);
            // For custom colors that aren't predefined, apply directly
            if (!['white', 'black', 'gray', 'blue', 'red', 'green'].includes(foregroundColor)) {
                trigger.style.setProperty('--crypto-donate-text', foregroundColor);
            }
        }

        trigger.innerHTML = `
            <div class="cryptodonate-trigger-icons">
                <img src="assets/btc.svg" alt="BTC" class="crypto-icon crypto-icon-1">
                <img src="assets/eth.svg" alt="ETH" class="crypto-icon crypto-icon-2">
                <img src="assets/sol.svg" alt="SOL" class="crypto-icon crypto-icon-3">
            </div>
            <span class="cryptodonate-trigger-text">Donate using crypto</span>
        `;
        
        trigger.addEventListener('click', () => this.showModal());
        this.appendChild(trigger);
    }

    renderModal() {
        const overlay = document.createElement('div');
        overlay.className = 'cryptodonate-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'cryptodonate-modal';
        
        // The actual widget will be rendered inside the modal
        const widgetContainer = document.createElement('div');
        
        modal.appendChild(widgetContainer);
        overlay.appendChild(modal);
        this.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideModal();
            }
        });

        this.setupWidget(widgetContainer);
    }

    showModal() {
        const overlay = this.querySelector('.cryptodonate-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
    }

    hideModal() {
        const overlay = this.querySelector('.cryptodonate-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }

    setupWidget(container) {
        const config = this.getConfig();
        if (Object.keys(config.wallets).length === 0) {
            container.innerHTML = `<div class="cryptodonate-widget" style="padding: 20px; text-align: center; color: red;">Error: No valid wallet addresses provided.</div>`;
            console.error('CryptoDonate Error: No wallets provided. Use <btc>address</btc>, <eth>address</eth>, or <sol>address</sol> tags.');
            return;
        }

        container.className = 'cryptodonate-widget';
        container.setAttribute('data-theme', config.theme);
        if (config.foreground) {
            container.setAttribute('data-foreground', config.foreground);
            // For custom colors that aren't predefined, apply directly
            if (!['white', 'black', 'gray', 'blue', 'red', 'green'].includes(config.foreground)) {
                container.style.setProperty('--crypto-donate-text', config.foreground);
                container.style.setProperty('--crypto-donate-btn-text', config.foreground);
            }
        }
        if (config.accent) {
            container.style.setProperty('--crypto-donate-accent', config.accent);
        }

        this.renderWidgetHTML(container, config);

        const qrCodeElement = container.querySelector('.cryptodonate-qr-code');
        if (!qrCodeElement) {
            console.error('CryptoDonate Error: QR code container not found.');
            return;
        }

        const qrCodeInstance = new QRCode(qrCodeElement, {
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        this.addEventListeners(container, config, qrCodeInstance);

        const initialCrypto = Object.keys(config.wallets)[0];
        this.updateWidgetState(container, config, qrCodeInstance, initialCrypto);
        
        const modal = this.querySelector('.cryptodonate-modal');
        if (modal) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'cryptodonate-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => this.hideModal());
            modal.appendChild(closeBtn);
        }
    }

    getConfig() {
        const wallets = {};
        // We need to find the original children, not the ones we are adding
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = this.initialHTML;
        
        for (const child of tempContainer.children) {
            const crypto = child.tagName.toLowerCase();
            const address = child.textContent.trim();
            if (['btc', 'eth', 'sol', 'usdt', 'xmr'].includes(crypto) && address) {
                wallets[crypto] = address;
            }
        }

        return {
            title: this.getAttribute('data-title') || 'Crypto Donation',
            message: this.getAttribute('data-message') || 'Your support is greatly appreciated!',
            wallets: wallets,
            theme: this.getAttribute('data-theme') || 'light',
            accent: this.getAttribute('data-accent'),
            foreground: this.getAttribute('data-foreground'),
        };
    }

    renderWidgetHTML(container, config) {
        const cryptoData = {
            btc: { name: 'Bitcoin', symbol: 'BTC', color: '#2a2a2a' },
            eth: { name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
            sol: { name: 'Solana', symbol: 'SOL', color: '#00d4aa' },
            usdt: { name: 'Tether USD', symbol: 'USDT', color: '#26a17b' },
            xmr: { name: 'Monero', symbol: 'XMR', color: '#ff6600' }
        };

        const availableCryptos = Object.keys(config.wallets);
        const selectedCrypto = availableCryptos[0];
        const selectedData = cryptoData[selectedCrypto];

        const cryptoOptions = availableCryptos
            .map(crypto => {
                const data = cryptoData[crypto];
                return `
                    <div class="cryptodonate-option" data-crypto="${crypto}">
                        <div class="cryptodonate-option-icon" style="background-color: ${data.color}">
                            <img src="assets/${crypto}.svg" alt="${data.symbol}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span class="cryptodonate-fallback-icon">${data.symbol[0]}</span>
                        </div>
                        <div class="cryptodonate-option-text">
                            <span class="cryptodonate-option-name">${data.name}</span>
                            <span class="cryptodonate-option-symbol">${data.symbol}</span>
                        </div>
                    </div>
                `;
            }).join('');

        container.innerHTML = `
            <div class="cryptodonate-header">
                <h3 class="cryptodonate-title">${config.title}</h3>
                <p class="cryptodonate-message">${config.message}</p>
            </div>
            <div class="cryptodonate-body">
                <div class="cryptodonate-crypto-select">
                    <div class="cryptodonate-selected-crypto" data-selected="${selectedCrypto}">
                        <div class="cryptodonate-selected-icon" style="background-color: ${selectedData.color}">
                            <img src="assets/${selectedCrypto}.svg" alt="${selectedData.symbol}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span class="cryptodonate-fallback-icon">${selectedData.symbol[0]}</span>
                        </div>
                        <div class="cryptodonate-selected-text">
                            <span class="cryptodonate-selected-name">${selectedData.name}</span>
                            <span class="cryptodonate-selected-symbol">${selectedData.symbol}</span>
                        </div>
                        <svg class="cryptodonate-dropdown-arrow" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div class="cryptodonate-dropdown-menu">
                        ${cryptoOptions}
                    </div>
                </div>
                <div class="cryptodonate-qr-code"></div>
                <div class="cryptodonate-address-container">
                    <input type="text" class="cryptodonate-address" readonly>
                    <button class="cryptodonate-copy-btn" aria-label="Copy address">
                        <svg fill="currentColor" viewBox="0 0 20 20"><path d="M16 12h-3v3h-2v-3H8v-2h3V7h2v3h3v2zm-8 4H4V4h4V2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2zm6-16H8v2h8V2c0-1.1-.9-2-2-2z"></path></svg>
                    </button>
                    <div class="cryptodonate-copy-feedback">Copied!</div>
                </div>
            </div>
        `;
    }

    addEventListeners(container, config, qrCodeInstance) {
        const selectedCrypto = container.querySelector('.cryptodonate-selected-crypto');
        const dropdownMenu = container.querySelector('.cryptodonate-dropdown-menu');
        const options = container.querySelectorAll('.cryptodonate-option');

        // Toggle dropdown
        selectedCrypto.addEventListener('click', () => {
            dropdownMenu.classList.toggle('show');
            selectedCrypto.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdownMenu.classList.remove('show');
                selectedCrypto.classList.remove('active');
            }
        });

        // Handle option selection
        options.forEach(option => {
            option.addEventListener('click', () => {
                const crypto = option.dataset.crypto;
                this.updateSelectedCrypto(container, crypto);
                this.updateWidgetState(container, config, qrCodeInstance, crypto);
                dropdownMenu.classList.remove('show');
                selectedCrypto.classList.remove('active');
            });
        });

        container.querySelector('.cryptodonate-copy-btn').addEventListener('click', () => {
            const addressInput = container.querySelector('.cryptodonate-address');
            navigator.clipboard.writeText(addressInput.value).then(() => {
                const feedback = container.querySelector('.cryptodonate-copy-feedback');
                feedback.classList.add('show');
                setTimeout(() => feedback.classList.remove('show'), 2000);
            }).catch(err => console.error('Failed to copy address: ', err));
        });
    }

    updateSelectedCrypto(container, crypto) {
        const cryptoData = {
            btc: { name: 'Bitcoin', symbol: 'BTC', color: '#2a2a2a' },
            eth: { name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
            sol: { name: 'Solana', symbol: 'SOL', color: '#00d4aa' },
            usdt: { name: 'Tether USD', symbol: 'USDT', color: '#26a17b' },
            xmr: { name: 'Monero', symbol: 'XMR', color: '#ff6600' }
        };

        const selectedCrypto = container.querySelector('.cryptodonate-selected-crypto');
        const data = cryptoData[crypto];
        
        selectedCrypto.dataset.selected = crypto;
        selectedCrypto.querySelector('.cryptodonate-selected-icon').style.backgroundColor = data.color;
        selectedCrypto.querySelector('.cryptodonate-selected-icon img').src = `assets/${crypto}.svg`;
        selectedCrypto.querySelector('.cryptodonate-selected-name').textContent = data.name;
        selectedCrypto.querySelector('.cryptodonate-selected-symbol').textContent = data.symbol;
        selectedCrypto.querySelector('.cryptodonate-fallback-icon').textContent = data.symbol[0];
    }

    updateWidgetState(container, config, qrCodeInstance, crypto) {
        const address = config.wallets[crypto];
        if (!address) {
            console.warn(`Address for ${crypto.toUpperCase()} not found.`);
            return;
        }

        container.querySelector('.cryptodonate-address').value = address;

        qrCodeInstance.clear();
        qrCodeInstance.makeCode(address);
    }
    
    constructor() {
        super();
        this.initialHTML = this.innerHTML;
        this.innerHTML = '';
    }
}

customElements.define('crypto-donate', CryptoDonateElement);