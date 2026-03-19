<?php

if (!defined('ABSPATH')) {
    exit;
}

class Woo_Order_Alert_Admin {
    public static function enqueue($hook) {
        if (!is_admin()) {
            return;
        }

        if (!current_user_can('manage_woocommerce')) {
            return;
        }

        $settings = Woo_Order_Alert_Settings::get_settings();
        if (empty($settings['enabled']) || $settings['enabled'] !== 'yes') {
            return;
        }

        $interval = isset($settings['polling_interval']) ? (int) $settings['polling_interval'] : 5000;
        if ($interval < 1000) {
            $interval = 1000;
        }

        $icon = function_exists('get_site_icon_url') ? get_site_icon_url(64) : '';

        wp_enqueue_script(
            'woo-order-alert-admin',
            WOO_ORDER_ALERT_URL . 'assets/admin.js',
            ['jquery'],
            '1.0.9',
            true
        );

        wp_localize_script('woo-order-alert-admin', 'WooOrderAlert', [
            'restUrl' => esc_url_raw(rest_url('order-alert/v1/latest')),
            'restNonce' => wp_create_nonce('wp_rest'),
            'interval' => $interval,
            'soundUrl' => esc_url_raw($settings['sound_url']),
            'storageKey' => 'wooOrderAlertLastId',
            'token' => Woo_Order_Alert_Settings::get_token(),
            'siteName' => wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES),
            'icon' => esc_url_raw($icon),
        ]);
    }
}
