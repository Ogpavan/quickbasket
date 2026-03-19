(function () {
    if (!window.WooOrderAlert || !window.WooOrderAlert.restUrl) {
        return;
    }

    var config = window.WooOrderAlert;
    var audio = null;
    var unlocked = false;
    var firstRun = true;

    function buildAudio() {
        if (!config.soundUrl) {
            return null;
        }
        if (!audio || audio.src !== config.soundUrl) {
            audio = new Audio(config.soundUrl);
            audio.preload = 'auto';
        }
        return audio;
    }

    function unlockAudio() {
        if (unlocked) {
            return;
        }
        var a = buildAudio();
        if (!a) {
            return;
        }
        a.play().then(function () {
            a.pause();
            a.currentTime = 0;
            unlocked = true;
        }).catch(function () {
            // Autoplay still blocked; will try again on next interaction.
        });
    }

    function requestNotifications() {
        if (!('Notification' in window)) {
            return;
        }
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    document.addEventListener('click', function () {
        unlockAudio();
        requestNotifications();
    }, { once: true, passive: true });

    function showToast(message) {
        var toast = document.getElementById('woo-order-alert-toast');
        if (!toast) {
            var style = document.createElement('style');
            style.textContent = '#woo-order-alert-toast{position:fixed;top:20px;right:20px;background:#1d2327;color:#fff;padding:10px 14px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.2);font-size:13px;z-index:99999;opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease;}#woo-order-alert-toast.show{opacity:1;transform:translateY(0);}';
            document.head.appendChild(style);
            toast = document.createElement('div');
            toast.id = 'woo-order-alert-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 3500);
    }

    function showNotification(latestId) {
        if (!('Notification' in window)) {
            return;
        }
        if (Notification.permission !== 'granted') {
            return;
        }
        var title = (config.siteName || 'Store') + ' - New Order';
        var options = {
            body: 'Order #' + latestId + ' received.',
            icon: config.icon || undefined,
            tag: 'woo-order-alert'
        };
        try {
            var note = new Notification(title, options);
            setTimeout(function () {
                note.close();
            }, 6000);
        } catch (e) {
            // Ignore notification errors.
        }
    }

    function playAlert() {
        var a = buildAudio();
        if (!a) {
            return;
        }
        a.currentTime = 0;
        a.play().catch(function () {
            showToast('New order received. Click anywhere to enable sound.');
        });
    }

    function getStoredId() {
        var raw = window.localStorage.getItem(config.storageKey);
        var parsed = parseInt(raw || '0', 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    function setStoredId(id) {
        window.localStorage.setItem(config.storageKey, String(id));
    }

    function pollLatest() {
        fetch(config.restUrl, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-WP-Nonce': config.restNonce,
                'X-Woo-Order-Alert': config.token || ''
            }
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                var latestId = data && data.latest_order_id ? parseInt(data.latest_order_id, 10) : 0;
                if (!latestId) {
                    firstRun = false;
                    return;
                }
                var lastId = getStoredId();
                if (firstRun && lastId === 0) {
                    setStoredId(latestId);
                    firstRun = false;
                    return;
                }
                if (latestId > lastId) {
                    setStoredId(latestId);
                    playAlert();
                    showNotification(latestId);
                    showToast('New order #' + latestId + ' received.');
                }
                firstRun = false;
            })
            .catch(function () {
                // Ignore transient errors.
            });
    }

    pollLatest();
    window.setInterval(pollLatest, config.interval || 5000);
})();
