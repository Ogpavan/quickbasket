<?php
/**
 * Plugin Name: Woo Order Alert
 * Description: Plays a notification sound in the WordPress admin when new WooCommerce orders arrive.
 * Version: 1.0.9
 * Author: Your Name
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('WOO_ORDER_ALERT_PATH')) {
    define('WOO_ORDER_ALERT_PATH', plugin_dir_path(__FILE__));
}

if (!defined('WOO_ORDER_ALERT_URL')) {
    define('WOO_ORDER_ALERT_URL', plugin_dir_url(__FILE__));
}

require_once WOO_ORDER_ALERT_PATH . 'includes/settings.php';
require_once WOO_ORDER_ALERT_PATH . 'includes/api.php';
require_once WOO_ORDER_ALERT_PATH . 'includes/admin.php';

add_action('woocommerce_loaded', function () {
    Woo_Order_Alert_Settings::init();
});

add_action('admin_post_woo_order_alert_save', ['Woo_Order_Alert_Settings', 'handle_save']);

add_action('rest_api_init', function () {
    if (!class_exists('WooCommerce')) {
        return;
    }
    if (!function_exists('register_rest_route')) {
        return;
    }
    Woo_Order_Alert_API::register_routes();
});

add_action('admin_enqueue_scripts', function ($hook) {
    if (!class_exists('WooCommerce')) {
        return;
    }
    Woo_Order_Alert_Admin::enqueue($hook);
});
