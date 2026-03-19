(function ($) {
    function getSoundField() {
        return $('#woo_order_alert_sound_url');
    }

    function updatePreview(url) {
        var preview = $('.woo-order-alert-audio-preview');
        if (preview.length) {
            preview.attr('src', url);
        }
    }

    $(document).on('click', '.woo-order-alert-media-button', function (e) {
        e.preventDefault();
        var frame = wp.media({
            title: 'Select alert sound',
            library: { type: 'audio' },
            button: { text: 'Use this sound' },
            multiple: false
        });

        frame.on('select', function () {
            var attachment = frame.state().get('selection').first().toJSON();
            var field = getSoundField();
            if (field && attachment.url) {
                field.val(attachment.url).trigger('change');
                updatePreview(attachment.url);
            }
        });

        frame.open();
    });

    $('#woo-order-alert-test-sound').on('click', function () {
        var field = getSoundField();
        var url = field ? field.val() : '';
        if (!url) {
            return;
        }
        var audio = new Audio(url);
        audio.play().catch(function () {
            // Autoplay may be blocked; user can interact to allow.
        });
    });

    function formatTime(date) {
        return date.toLocaleString();
    }

    function updateLatestInfo() {
        if (!window.WooOrderAlertSettings || !window.WooOrderAlertSettings.restUrl) {
            return;
        }
        fetch(window.WooOrderAlertSettings.restUrl, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-WP-Nonce': window.WooOrderAlertSettings.restNonce,
                'X-Woo-Order-Alert': window.WooOrderAlertSettings.token || ''
            }
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                var latestId = data && data.latest_order_id ? data.latest_order_id : 0;
                $('.woo-order-alert-latest-id').text(latestId || '-');
                $('.woo-order-alert-last-checked').text('Last checked: ' + formatTime(new Date()));
            })
            .catch(function () {
                $('.woo-order-alert-last-checked').text('Last checked: ' + formatTime(new Date()) + ' (error)');
            });
    }

    if ($('#woo-order-alert-latest').length) {
        updateLatestInfo();
        var interval = (window.WooOrderAlertSettings && window.WooOrderAlertSettings.interval)
            ? window.WooOrderAlertSettings.interval
            : 5000;
        window.setInterval(updateLatestInfo, interval);
    }
})(jQuery);
