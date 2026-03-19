<?php

if (!defined('ABSPATH')) {
    exit;
}

class Woo_Order_Alert_API {
    public static function register_routes() {
        add_filter('rest_authentication_errors', [__CLASS__, 'maybe_bypass_auth'], 100);

        register_rest_route('order-alert/v1', '/latest', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_latest_order'],
            'permission_callback' => [__CLASS__, 'permission_check'],
        ]);
    }

    public static function permission_check($request) {
        $token = self::get_request_token();
        if (!empty($token) && hash_equals(Woo_Order_Alert_Settings::get_token(), $token)) {
            return true;
        }
        return current_user_can('manage_woocommerce');
    }

    public static function maybe_bypass_auth($result) {
        if (!is_wp_error($result)) {
            return $result;
        }

        $token = self::get_request_token();
        if (empty($token) || !hash_equals(Woo_Order_Alert_Settings::get_token(), $token)) {
            return $result;
        }

        $prefix = rest_get_url_prefix();
        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        $route = '/' . $prefix . '/order-alert/v1/latest';

        if (strpos($uri, $route) !== false) {
            return null;
        }

        return $result;
    }

    private static function get_request_token() {
        $header = '';
        if (isset($_SERVER['HTTP_X_WOO_ORDER_ALERT'])) {
            $header = sanitize_text_field(wp_unslash($_SERVER['HTTP_X_WOO_ORDER_ALERT']));
        }
        if (!empty($header)) {
            return $header;
        }
        if (isset($_GET['woo_order_alert_token'])) {
            return sanitize_text_field(wp_unslash($_GET['woo_order_alert_token']));
        }
        return '';
    }

    public static function get_latest_order($request) {
        $settings = Woo_Order_Alert_Settings::get_settings();
        $statuses = isset($settings['order_statuses']) && is_array($settings['order_statuses'])
            ? $settings['order_statuses']
            : [];

        $cache_key = 'woo_order_alert_latest_' . md5(implode('|', $statuses));
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            return rest_ensure_response(['latest_order_id' => (int) $cached]);
        }

        $args = [
            'status' => $statuses,
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'return' => 'ids',
        ];

        $orders = wc_get_orders($args);
        $latest_id = !empty($orders) ? (int) $orders[0] : 0;

        set_transient($cache_key, $latest_id, 5);

        return rest_ensure_response(['latest_order_id' => $latest_id]);
    }
}
