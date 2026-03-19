<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Woo_Order_Alert_Settings_Page') && class_exists('WC_Settings_Page')) {
    class Woo_Order_Alert_Settings_Page extends WC_Settings_Page {
        public function __construct() {
            $this->id = 'woo_order_alert';
            $this->label = __('Order Alert', 'woo-order-alert');
            parent::__construct();
        }

        public function get_settings() {
            return Woo_Order_Alert_Settings::get_settings_fields();
        }

        public function output() {
            WC_Admin_Settings::output_fields($this->get_settings());
        }

        public function save() {
            WC_Admin_Settings::save_fields($this->get_settings());
        }
    }
}

class Woo_Order_Alert_Settings {
    const PAGE_SLUG = 'woo-order-alert-settings';
    const TOKEN_OPTION = 'woo_order_alert_token';

    public static function init() {
        self::ensure_token();
        add_action('admin_menu', [__CLASS__, 'register_menu'], 99);
        add_action('woocommerce_admin_field_media', [__CLASS__, 'render_media_field']);
        add_action('woocommerce_admin_field_test_sound', [__CLASS__, 'render_test_sound_field']);
        add_action('woocommerce_admin_field_latest_info', [__CLASS__, 'render_latest_info_field']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'maybe_enqueue_settings_assets']);
    }

    public static function ensure_token() {
        $token = get_option(self::TOKEN_OPTION, '');
        if (empty($token)) {
            $token = wp_generate_password(32, false, false);
            update_option(self::TOKEN_OPTION, $token);
        }
    }

    public static function get_token() {
        return (string) get_option(self::TOKEN_OPTION, '');
    }

    public static function register_menu() {
        if (!class_exists('WooCommerce')) {
            return;
        }
        add_submenu_page(
            'woocommerce',
            __('Woo Order Alert', 'woo-order-alert'),
            __('Order Alert', 'woo-order-alert'),
            'manage_woocommerce',
            self::PAGE_SLUG,
            [__CLASS__, 'render_settings_page']
        );
    }

    public static function render_settings_page() {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Woo Order Alert', 'woo-order-alert') . '</h1>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('woo_order_alert_save', 'woo_order_alert_nonce');
        echo '<input type="hidden" name="action" value="woo_order_alert_save" />';
        WC_Admin_Settings::output_fields(self::get_settings_fields());
        submit_button();
        echo '</form>';
        echo '</div>';
    }

    public static function handle_save() {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('You do not have permission to save these settings.', 'woo-order-alert'));
        }
        check_admin_referer('woo_order_alert_save', 'woo_order_alert_nonce');

        $fields = self::get_settings_fields();
        WC_Admin_Settings::save_fields($fields);

        wp_redirect(add_query_arg('settings-updated', 'true', admin_url('admin.php?page=' . self::PAGE_SLUG)));
        exit;
    }

    public static function get_settings_fields() {
        $order_statuses = function_exists('wc_get_order_statuses') ? wc_get_order_statuses() : [];

        return [
            [
                'title' => __('Woo Order Alert', 'woo-order-alert'),
                'type' => 'title',
                'desc' => __('Play a notification sound in admin when new orders arrive.', 'woo-order-alert'),
                'id' => 'woo_order_alert_title',
            ],
            [
                'title' => __('Enable Alert', 'woo-order-alert'),
                'id' => 'woo_order_alert_enabled',
                'type' => 'checkbox',
                'default' => 'yes',
                'desc' => __('Play sound when a new order arrives', 'woo-order-alert'),
            ],
            [
                'title' => __('Polling Interval (ms)', 'woo-order-alert'),
                'id' => 'woo_order_alert_polling_interval',
                'type' => 'number',
                'default' => '5000',
                'desc' => __('How often to check for new orders in milliseconds.', 'woo-order-alert'),
                'desc_tip' => true,
                'custom_attributes' => [
                    'min' => '1000',
                    'step' => '500',
                ],
            ],
            [
                'title' => __('Alert Sound', 'woo-order-alert'),
                'id' => 'woo_order_alert_sound_url',
                'type' => 'media',
                'default' => '',
                'desc' => __('Upload or select an audio file to play.', 'woo-order-alert'),
                'desc_tip' => true,
            ],
            [
                'title' => __('Order Status Filter', 'woo-order-alert'),
                'id' => 'woo_order_alert_statuses',
                'type' => 'multiselect',
                'class' => 'wc-enhanced-select',
                'default' => ['wc-processing', 'wc-pending'],
                'options' => $order_statuses,
                'desc' => __('Only alert for orders with these statuses.', 'woo-order-alert'),
                'desc_tip' => true,
            ],
            [
                'title' => __('Latest Order', 'woo-order-alert'),
                'id' => 'woo_order_alert_latest_info',
                'type' => 'latest_info',
                'default' => '',
            ],
            [
                'title' => __('Test Sound', 'woo-order-alert'),
                'id' => 'woo_order_alert_test_sound',
                'type' => 'test_sound',
                'default' => '',
            ],
            [
                'type' => 'sectionend',
                'id' => 'woo_order_alert_end',
            ],
        ];
    }

    public static function render_media_field($field) {
        $field_id = esc_attr($field['id']);
        $value = get_option($field['id'], $field['default'] ?? '');
        ?>
        <tr valign="top">
            <th scope="row" class="titledesc">
                <label for="<?php echo $field_id; ?>"><?php echo esc_html($field['title']); ?></label>
                <?php echo WC_Admin_Settings::get_field_description($field); ?>
            </th>
            <td class="forminp">
                <fieldset>
                    <input
                        class="regular-text"
                        type="text"
                        id="<?php echo $field_id; ?>"
                        name="<?php echo $field_id; ?>"
                        value="<?php echo esc_attr($value); ?>"
                    />
                    <button class="button woo-order-alert-media-button" type="button">
                        <?php esc_html_e('Select Audio', 'woo-order-alert'); ?>
                    </button>
                    <p class="description"><?php echo wp_kses_post($field['desc'] ?? ''); ?></p>
                    <audio class="woo-order-alert-audio-preview" src="<?php echo esc_url($value); ?>" preload="none" controls style="margin-top:8px; max-width: 320px;"></audio>
                </fieldset>
            </td>
        </tr>
        <?php
    }

    public static function render_test_sound_field($field) {
        ?>
        <tr valign="top">
            <th scope="row" class="titledesc">
                <label><?php echo esc_html($field['title']); ?></label>
            </th>
            <td class="forminp">
                <button class="button" type="button" id="woo-order-alert-test-sound">
                    <?php esc_html_e('Play Test Sound', 'woo-order-alert'); ?>
                </button>
                <p class="description"><?php esc_html_e('Plays the selected alert sound once.', 'woo-order-alert'); ?></p>
            </td>
        </tr>
        <?php
    }

    public static function render_latest_info_field($field) {
        ?>
        <tr valign="top">
            <th scope="row" class="titledesc">
                <label><?php echo esc_html($field['title']); ?></label>
            </th>
            <td class="forminp">
                <div id="woo-order-alert-latest">
                    <strong><?php esc_html_e('Latest order ID:', 'woo-order-alert'); ?></strong>
                    <span class="woo-order-alert-latest-id">-</span>
                    <br />
                    <small class="woo-order-alert-last-checked">-</small>
                </div>
                <p class="description"><?php esc_html_e('Uses the same polling endpoint as the Orders screen.', 'woo-order-alert'); ?></p>
            </td>
        </tr>
        <?php
    }

    public static function maybe_enqueue_settings_assets($hook) {
        if ($hook !== 'woocommerce_page_' . self::PAGE_SLUG) {
            return;
        }

        $interval = (int) get_option('woo_order_alert_polling_interval', 5000);
        if ($interval < 1000) {
            $interval = 1000;
        }

        wp_enqueue_media();
        wp_enqueue_script(
            'woo-order-alert-settings',
            WOO_ORDER_ALERT_URL . 'assets/settings.js',
            ['jquery'],
            '1.0.7',
            true
        );
        wp_localize_script('woo-order-alert-settings', 'WooOrderAlertSettings', [
            'restUrl' => esc_url_raw(rest_url('order-alert/v1/latest')),
            'restNonce' => wp_create_nonce('wp_rest'),
            'interval' => $interval,
            'token' => self::get_token(),
        ]);
    }

    public static function get_settings() {
        $statuses = get_option('woo_order_alert_statuses', ['wc-processing', 'wc-pending']);
        if (!is_array($statuses)) {
            $statuses = array_filter(array_map('trim', explode(',', (string) $statuses)));
        }

        return [
            'enabled' => get_option('woo_order_alert_enabled', 'yes'),
            'polling_interval' => get_option('woo_order_alert_polling_interval', '5000'),
            'sound_url' => get_option('woo_order_alert_sound_url', ''),
            'order_statuses' => $statuses,
        ];
    }
}
