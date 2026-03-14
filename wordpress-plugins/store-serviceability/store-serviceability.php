<?php
/**
 * Plugin Name: Store Serviceability
 * Description: Adds multi-store delivery radius checks and a nearest-store REST endpoint.
 * Version: 1.3.2
 * Author: QuickBasket
 */

if (!defined("ABSPATH")) {
    exit;
}

register_activation_hook(__FILE__, "qb_store_serviceability_activate");

function qb_store_serviceability_activate()
{
    global $wpdb;
    $table_name = $wpdb->prefix . "stores";
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE {$table_name} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(191) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        delivery_radius INT NOT NULL DEFAULT 0,
        address TEXT NULL,
        status TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        KEY status (status)
    ) {$charset_collate};";

    require_once ABSPATH . "wp-admin/includes/upgrade.php";
    dbDelta($sql);
}

add_action("rest_api_init", function () {
    register_rest_route(
        "store/v1",
        "/nearest",
        array(
            "methods" => "GET",
            "callback" => "qb_store_serviceability_nearest",
            "permission_callback" => "__return_true",
            "args" => array(
            "lat" => array(
                "required" => true,
                "validate_callback" => function ($value) {
                    return is_numeric($value);
                }
            ),
            "lng" => array(
                "required" => true,
                "validate_callback" => function ($value) {
                    return is_numeric($value);
                }
            )
        )
        )
    );

    register_rest_route(
        "store/v1",
        "/stores",
        array(
            "methods" => "GET",
            "callback" => "qb_store_serviceability_list",
            "permission_callback" => "__return_true"
        )
    );
});

add_filter("woocommerce_get_sections_shipping", "qb_delivery_pricing_add_section");
add_filter("woocommerce_get_settings_shipping", "qb_delivery_pricing_settings", 10, 2);
add_action("woocommerce_update_options_shipping_quickbasket_delivery", "qb_delivery_pricing_save_settings");

function qb_delivery_pricing_add_section($sections)
{
    $sections["quickbasket_delivery"] = "QuickBasket Delivery";
    return $sections;
}

function qb_delivery_pricing_settings($settings, $current_section)
{
    if ($current_section !== "quickbasket_delivery") {
        return $settings;
    }

    return array(
        array(
            "title" => "Delivery Pricing",
            "type" => "title",
            "desc" => "Configure delivery fee rules based on distance and order value.",
            "id" => "qb_delivery_pricing"
        ),
        array(
            "title" => "Store delivery radius (km)",
            "id" => "qb_delivery_store_radius_km",
            "type" => "number",
            "default" => "0",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Default store delivery radius used for checkout validation. Set 0 to disable."
        ),
        array(
            "title" => "Distance slabs (km=₹)",
            "id" => "qb_delivery_slabs_range",
            "type" => "qb_delivery_slabs_range",
            "default" => array(
                array("from" => "0", "to" => "1", "fee" => "0"),
                array("from" => "1", "to" => "3", "fee" => "20"),
                array("from" => "3", "to" => "5", "fee" => "30"),
                array("from" => "5", "to" => "7", "fee" => "40")
            ),
            "desc_tip" => true,
            "desc" => "Add distance ranges with a fixed fee per range."
        ),
        array(
            "title" => "Small cart threshold (₹)",
            "id" => "qb_delivery_small_cart_threshold",
            "type" => "number",
            "default" => "149",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Orders below this subtotal will get a small cart fee."
        ),
        array(
            "title" => "Small cart fee (₹)",
            "id" => "qb_delivery_small_cart_fee",
            "type" => "number",
            "default" => "15",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Added when order subtotal is below the small cart threshold."
        ),
        array(
            "title" => "Surge multiplier",
            "id" => "qb_delivery_surge_multiplier",
            "type" => "number",
            "default" => "1.0",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Multiplier applied to the delivery fee."
        ),
        array(
            "title" => "Free delivery above order value (₹)",
            "id" => "qb_delivery_free_threshold",
            "type" => "number",
            "default" => "499",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Orders at or above this subtotal get free delivery."
        ),
        array(
            "title" => "Handling charge (₹)",
            "id" => "qb_delivery_handling_fee",
            "type" => "number",
            "default" => "0",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Fixed handling charge applied to each order."
        ),
        array(
            "title" => "Max delivery fee (₹)",
            "id" => "qb_delivery_max_fee",
            "type" => "number",
            "default" => "80",
            "custom_attributes" => array(
                "min" => "0",
                "step" => "0.01"
            ),
            "desc_tip" => true,
            "desc" => "Maximum delivery fee cap. Set 0 for no cap."
        ),
        array(
            "type" => "sectionend",
            "id" => "qb_delivery_pricing"
        )
    );
}

function qb_delivery_pricing_save_settings()
{
    $settings = qb_delivery_pricing_settings(array(), "quickbasket_delivery");
    if (class_exists("WC_Admin_Settings")) {
        WC_Admin_Settings::save_fields($settings);
    }
}

add_action("woocommerce_admin_field_qb_delivery_slabs_range", "qb_delivery_pricing_render_slabs_range_field");
add_filter("woocommerce_admin_settings_sanitize_option", "qb_delivery_pricing_sanitize_slabs_range", 10, 3);

function qb_delivery_pricing_render_slabs_range_field($option)
{
    $value = get_option($option["id"], isset($option["default"]) ? $option["default"] : array());
    if (!is_array($value)) {
        $value = array();
    }
    if (empty($value)) {
        $value[] = array("from" => "", "to" => "", "fee" => "");
    }

    $field_id = esc_attr($option["id"]);
    $field_title = isset($option["title"]) ? $option["title"] : "";
    $field_desc = isset($option["desc"]) ? $option["desc"] : "";
    $tip = isset($option["desc_tip"]) && $option["desc_tip"] ? $field_desc : "";
    ?>
    <tr valign="top">
        <th scope="row" class="titledesc">
            <label for="<?php echo $field_id; ?>"><?php echo esc_html($field_title); ?></label>
            <?php if ($tip !== "") : ?>
                <?php echo wc_help_tip($tip); ?>
            <?php endif; ?>
        </th>
        <td class="forminp forminp-<?php echo esc_attr($option["type"]); ?>">
            <table class="widefat qb-delivery-slabs-table" style="max-width: 640px;">
                <thead>
                    <tr>
                        <th><?php esc_html_e("From (km)", "store-serviceability"); ?></th>
                        <th><?php esc_html_e("To (km)", "store-serviceability"); ?></th>
                        <th><?php esc_html_e("Fee (₹)", "store-serviceability"); ?></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($value as $row) : ?>
                        <tr>
                            <td>
                                <input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[from][]" value="<?php echo esc_attr(isset($row["from"]) ? $row["from"] : ""); ?>" />
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[to][]" value="<?php echo esc_attr(isset($row["to"]) ? $row["to"] : ""); ?>" />
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[fee][]" value="<?php echo esc_attr(isset($row["fee"]) ? $row["fee"] : ""); ?>" />
                            </td>
                            <td>
                                <button type="button" class="button qb-remove-slab"><?php esc_html_e("Remove", "store-serviceability"); ?></button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4">
                            <button type="button" class="button button-secondary qb-add-slab"><?php esc_html_e("Add slab", "store-serviceability"); ?></button>
                        </td>
                    </tr>
                </tfoot>
            </table>
            <?php if ($field_desc !== "" && empty($tip)) : ?>
                <p class="description"><?php echo esc_html($field_desc); ?></p>
            <?php endif; ?>
        </td>
    </tr>
    <script>
    (function($){
        $(document).on('click', '.qb-add-slab', function(){
            var $table = $(this).closest('table.qb-delivery-slabs-table');
            var $tbody = $table.find('tbody');
            var rowHtml = '<tr>' +
                '<td><input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[from][]" value="" /></td>' +
                '<td><input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[to][]" value="" /></td>' +
                '<td><input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[fee][]" value="" /></td>' +
                '<td><button type="button" class="button qb-remove-slab"><?php echo esc_js(__("Remove", "store-serviceability")); ?></button></td>' +
            '</tr>';
            $tbody.append(rowHtml);
        });

        $(document).on('click', '.qb-remove-slab', function(){
            var $tbody = $(this).closest('tbody');
            $(this).closest('tr').remove();
            if ($tbody.find('tr').length === 0) {
                $tbody.append('<tr>' +
                    '<td><input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[from][]" value="" /></td>' +
                    '<td><input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[to][]" value="" /></td>' +
                    '<td><input type="number" step="0.01" min="0" name="<?php echo $field_id; ?>[fee][]" value="" /></td>' +
                    '<td><button type="button" class="button qb-remove-slab"><?php echo esc_js(__("Remove", "store-serviceability")); ?></button></td>' +
                '</tr>');
            }
        });
    })(jQuery);
    </script>
    <?php
}

function qb_delivery_pricing_sanitize_slabs_range($value, $option, $raw_value)
{
    if (!isset($option["id"]) || $option["id"] !== "qb_delivery_slabs_range") {
        return $value;
    }

    if (!is_array($raw_value)) {
        return array();
    }

    $froms = isset($raw_value["from"]) && is_array($raw_value["from"]) ? $raw_value["from"] : array();
    $tos = isset($raw_value["to"]) && is_array($raw_value["to"]) ? $raw_value["to"] : array();
    $fees = isset($raw_value["fee"]) && is_array($raw_value["fee"]) ? $raw_value["fee"] : array();

    $rows = array();
    $count = max(count($froms), count($tos), count($fees));

    for ($i = 0; $i < $count; $i++) {
        $from = isset($froms[$i]) ? floatval($froms[$i]) : null;
        $to = isset($tos[$i]) ? floatval($tos[$i]) : null;
        $fee = isset($fees[$i]) ? floatval($fees[$i]) : null;

        if ($from === null || $to === null || $fee === null) {
            continue;
        }
        if ($from < 0 || $to <= $from || $fee < 0) {
            continue;
        }

        $rows[] = array(
            "from" => (string) $from,
            "to" => (string) $to,
            "fee" => (string) $fee
        );
    }

    return $rows;
}

function qb_store_serviceability_nearest(WP_REST_Request $request)
{
    global $wpdb;
    $lat = floatval($request->get_param("lat"));
    $lng = floatval($request->get_param("lng"));

    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        return new WP_REST_Response(array("serviceable" => false), 400);
    }

    $table_name = $wpdb->prefix . "stores";
    $sql = $wpdb->prepare(
        "SELECT id, name, latitude, longitude, delivery_radius,
        (6371 * ACOS(LEAST(1, GREATEST(-1,
            COS(RADIANS(%f)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(%f))
            + SIN(RADIANS(%f)) * SIN(RADIANS(latitude))
        )))) AS distance
        FROM {$table_name}
        WHERE status = 1
        ORDER BY distance ASC
        LIMIT 1",
        $lat,
        $lng,
        $lat
    );

    $store = $wpdb->get_row($sql);
    if (!$store) {
        return new WP_REST_Response(array("serviceable" => false), 200);
    }

    $distance = isset($store->distance) ? floatval($store->distance) : 0.0;
    $radius = isset($store->delivery_radius) ? intval($store->delivery_radius) : 0;
    $serviceable = $radius > 0 && $distance <= $radius;

    if (!$serviceable) {
        return new WP_REST_Response(
            array(
                "serviceable" => false,
                "fees" => qb_delivery_pricing_get_fees()
            ),
            200
        );
    }

    return new WP_REST_Response(
        array(
            "serviceable" => true,
            "store" => array(
                "id" => intval($store->id),
                "name" => $store->name,
                "distance" => round($distance, 2)
            ),
            "fees" => qb_delivery_pricing_get_fees()
        ),
        200
    );
}

function qb_store_serviceability_list(WP_REST_Request $request)
{
    global $wpdb;
    $table_name = $wpdb->prefix . "stores";
    $rows = $wpdb->get_results(
        "SELECT id, name, latitude, longitude, delivery_radius, address
         FROM {$table_name}
         WHERE status = 1
         ORDER BY name ASC"
    );

    if (!$rows) {
        return new WP_REST_Response(array(), 200);
    }

    $stores = array_map(function ($row) {
        return array(
            "id" => intval($row->id),
            "name" => $row->name,
            "latitude" => floatval($row->latitude),
            "longitude" => floatval($row->longitude),
            "delivery_radius" => intval($row->delivery_radius),
            "address" => $row->address
        );
    }, $rows);

    return new WP_REST_Response($stores, 200);
}

function qb_delivery_pricing_parse_slabs()
{
    $slabs = array();

    $range_rows = get_option("qb_delivery_slabs_range", null);
    if (is_array($range_rows) && !empty($range_rows)) {
        foreach ($range_rows as $row) {
            $from = isset($row["from"]) ? floatval($row["from"]) : null;
            $to = isset($row["to"]) ? floatval($row["to"]) : null;
            $fee = isset($row["fee"]) ? floatval($row["fee"]) : null;

            if ($from === null || $to === null || $fee === null) {
                continue;
            }
            if ($from < 0 || $to <= $from || $fee < 0) {
                continue;
            }

            $slabs[] = array(
                "from_km" => $from,
                "to_km" => $to,
                "fee" => $fee
            );
        }
    } else {
        $raw = (string) get_option("qb_delivery_slabs", "");
        $lines = preg_split("/\\r?\\n/", $raw);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === "") {
                continue;
            }
            $line = str_replace(array("-", ":"), "=", $line);
            if (strpos($line, "=") === false) {
                continue;
            }

            list($max, $fee) = array_map("trim", explode("=", $line, 2));
            $maxDistance = floatval($max);
            $feeAmount = floatval($fee);

            if ($maxDistance <= 0 || $feeAmount < 0) {
                continue;
            }

            $slabs[] = array(
                "from_km" => 0.0,
                "to_km" => $maxDistance,
                "fee" => $feeAmount
            );
        }
    }

    usort($slabs, function ($a, $b) {
        if ($a["from_km"] === $b["from_km"]) {
            return $a["to_km"] <=> $b["to_km"];
        }
        return $a["from_km"] <=> $b["from_km"];
    });

    return $slabs;
}

function qb_delivery_pricing_get_fees()
{
    return array(
        "store_radius_km" => floatval(get_option("qb_delivery_store_radius_km", 0)),
        "small_cart_threshold" => floatval(get_option("qb_delivery_small_cart_threshold", 149)),
        "small_cart_fee" => floatval(get_option("qb_delivery_small_cart_fee", 15)),
        "surge_multiplier" => floatval(get_option("qb_delivery_surge_multiplier", 1.0)),
        "free_delivery_threshold" => floatval(get_option("qb_delivery_free_threshold", 499)),
        "handling_fee" => floatval(get_option("qb_delivery_handling_fee", 0)),
        "max_delivery_fee" => floatval(get_option("qb_delivery_max_fee", 80)),
        "slabs" => qb_delivery_pricing_parse_slabs()
    );
}

if (!function_exists("get_distance_km")) {
    function get_distance_km($lat1, $lon1, $lat2, $lon2)
    {
        $earth_radius = 6371;

        $lat_diff = deg2rad($lat2 - $lat1);
        $lon_diff = deg2rad($lon2 - $lon1);

        $a = sin($lat_diff / 2) * sin($lat_diff / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($lon_diff / 2) * sin($lon_diff / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earth_radius * $c;
    }
}

function qb_delivery_pricing_get_base_fee_from_slabs($distance_km)
{
    $slab = qb_delivery_pricing_get_matching_slab($distance_km);
    if (!$slab) {
        return 0.0;
    }
    return floatval($slab["fee"]);
}

function qb_delivery_pricing_get_matching_slab($distance_km)
{
    $slabs = qb_delivery_pricing_parse_slabs();
    foreach ($slabs as $slab) {
        if ($distance_km >= $slab["from_km"] && $distance_km <= $slab["to_km"]) {
            return $slab;
        }
    }
    return null;
}

function calculate_delivery_fee($user_lat, $user_lng, $store_lat, $store_lng, $order_total, $store_radius_override = null)
{
    $distance = get_distance_km($user_lat, $user_lng, $store_lat, $store_lng);

    $store_radius = $store_radius_override;
    if ($store_radius === null) {
        $store_radius = floatval(get_option("qb_delivery_store_radius_km", 0));
    }

    if ($store_radius > 0 && $distance > $store_radius) {
        return "store_not_available";
    }

    $fee = qb_delivery_pricing_get_base_fee_from_slabs($distance);

    $small_cart_threshold = floatval(get_option("qb_delivery_small_cart_threshold", 149));
    $small_cart_fee = floatval(get_option("qb_delivery_small_cart_fee", 15));
    if ($small_cart_threshold > 0 && $order_total < $small_cart_threshold) {
        $fee += $small_cart_fee;
    }

    $surge_multiplier = floatval(get_option("qb_delivery_surge_multiplier", 1.0));
    if ($surge_multiplier > 0) {
        $fee = $fee * $surge_multiplier;
    }

    $free_delivery_threshold = floatval(get_option("qb_delivery_free_threshold", 499));
    if ($free_delivery_threshold > 0 && $order_total >= $free_delivery_threshold) {
        $fee = 0;
    }

    $max_delivery_fee = floatval(get_option("qb_delivery_max_fee", 80));
    if ($max_delivery_fee > 0) {
        $fee = min($fee, $max_delivery_fee);
    }

    return max(0, $fee);
}

function qb_delivery_pricing_get_breakdown($user_lat, $user_lng, $store_lat, $store_lng, $order_total, $store_radius_override = null)
{
    $distance = get_distance_km($user_lat, $user_lng, $store_lat, $store_lng);

    $store_radius = $store_radius_override;
    if ($store_radius === null) {
        $store_radius = floatval(get_option("qb_delivery_store_radius_km", 0));
    }

    if ($store_radius > 0 && $distance > $store_radius) {
        return array(
            "status" => "store_not_available",
            "distance_km" => $distance,
            "store_radius_km" => $store_radius
        );
    }

    $matching_slab = qb_delivery_pricing_get_matching_slab($distance);
    $base_fee = $matching_slab ? floatval($matching_slab["fee"]) : 0.0;

    $small_cart_threshold = floatval(get_option("qb_delivery_small_cart_threshold", 149));
    $small_cart_fee = floatval(get_option("qb_delivery_small_cart_fee", 15));
    $applied_small_cart_fee = 0.0;

    if ($small_cart_threshold > 0 && $order_total < $small_cart_threshold) {
        $applied_small_cart_fee = $small_cart_fee;
    }

    $pre_surge_fee = $base_fee + $applied_small_cart_fee;

    $surge_multiplier = floatval(get_option("qb_delivery_surge_multiplier", 1.0));
    if ($surge_multiplier <= 0) {
        $surge_multiplier = 1.0;
    }
    $post_surge_fee = $pre_surge_fee * $surge_multiplier;
    $surge_amount = $post_surge_fee - $pre_surge_fee;

    $free_delivery_threshold = floatval(get_option("qb_delivery_free_threshold", 499));
    $free_delivery_applied = false;
    $free_delivery_discount = 0.0;
    $pre_free_fee = $post_surge_fee;
    $fee = $post_surge_fee;
    if ($free_delivery_threshold > 0 && $order_total >= $free_delivery_threshold) {
        $fee = 0;
        $free_delivery_applied = true;
        $free_delivery_discount = $pre_free_fee;
    }

    $max_delivery_fee = floatval(get_option("qb_delivery_max_fee", 80));
    $capped = false;
    $cap_discount = 0.0;
    $pre_cap_fee = $fee;
    if ($max_delivery_fee > 0 && $fee > $max_delivery_fee) {
        $fee = $max_delivery_fee;
        $capped = true;
        $cap_discount = $pre_cap_fee - $fee;
    }

    return array(
        "status" => "ok",
        "distance_km" => $distance,
        "store_radius_km" => $store_radius,
        "slab" => $matching_slab,
        "base_fee" => $base_fee,
        "small_cart_threshold" => $small_cart_threshold,
        "small_cart_fee" => $small_cart_fee,
        "applied_small_cart_fee" => $applied_small_cart_fee,
        "pre_surge_fee" => $pre_surge_fee,
        "surge_multiplier" => $surge_multiplier,
        "surge_amount" => $surge_amount,
        "pre_free_fee" => $pre_free_fee,
        "free_delivery_threshold" => $free_delivery_threshold,
        "free_delivery_applied" => $free_delivery_applied,
        "free_delivery_discount" => $free_delivery_discount,
        "max_delivery_fee" => $max_delivery_fee,
        "capped" => $capped,
        "cap_discount" => $cap_discount,
        "final_fee" => max(0, $fee)
    );
}

function qb_delivery_pricing_get_context()
{
    $context = array();

    if (function_exists("WC") && WC()->session) {
        $session_context = WC()->session->get("qb_delivery_context");
        if (is_array($session_context)) {
            $context = array_merge($context, $session_context);
        }

        $context_keys = array(
            "user_lat" => "qb_user_lat",
            "user_lng" => "qb_user_lng",
            "store_lat" => "qb_store_lat",
            "store_lng" => "qb_store_lng",
            "store_radius" => "qb_store_radius"
        );

        foreach ($context_keys as $context_key => $session_key) {
            $value = WC()->session->get($session_key);
            if ($value !== null && $value !== "") {
                $context[$context_key] = $value;
            }
        }
    }

    return apply_filters("qb_delivery_pricing_context", $context);
}

function qb_delivery_pricing_get_order_total()
{
    if (!function_exists("WC") || !WC()->cart) {
        return 0.0;
    }

    if (method_exists(WC()->cart, "get_displayed_subtotal")) {
        $total = floatval(WC()->cart->get_displayed_subtotal());
    } else {
        $total = floatval(WC()->cart->get_subtotal());
    }
    return apply_filters("qb_delivery_pricing_order_total", $total);
}

function qb_delivery_pricing_add_notice_once($message, $type = "error")
{
    if (function_exists("wc_has_notice") && wc_has_notice($message, $type)) {
        return;
    }
    if (function_exists("wc_add_notice")) {
        wc_add_notice($message, $type);
    }
}

function qb_delivery_pricing_format_price($amount)
{
    if (function_exists("wc_price")) {
        return wc_price($amount);
    }
    return number_format((float) $amount, 2, ".", "");
}

function qb_delivery_pricing_get_breakdown_lines($breakdown)
{
    $lines = array();
    $lines[] = "Distance: " . number_format((float) $breakdown["distance_km"], 2, ".", "") . " km";

    if (!empty($breakdown["slab"])) {
        $from = number_format((float) $breakdown["slab"]["from_km"], 2, ".", "");
        $to = number_format((float) $breakdown["slab"]["to_km"], 2, ".", "");
        $lines[] = "Base fee (" . $from . "–" . $to . " km): " . qb_delivery_pricing_format_price($breakdown["base_fee"]);
    } else {
        $lines[] = "Base fee: " . qb_delivery_pricing_format_price($breakdown["base_fee"]);
    }

    if ($breakdown["applied_small_cart_fee"] > 0) {
        $lines[] = "Small cart fee (< " . qb_delivery_pricing_format_price($breakdown["small_cart_threshold"]) . "): " . qb_delivery_pricing_format_price($breakdown["applied_small_cart_fee"]);
    }

    if ($breakdown["surge_multiplier"] != 1.0 && $breakdown["surge_amount"] > 0) {
        $lines[] = "Surge x" . number_format((float) $breakdown["surge_multiplier"], 2, ".", "") . ": " . qb_delivery_pricing_format_price($breakdown["surge_amount"]);
    }

    if ($breakdown["free_delivery_applied"]) {
        $lines[] = "Free delivery applied (≥ " . qb_delivery_pricing_format_price($breakdown["free_delivery_threshold"]) . ")";
    }

    if ($breakdown["capped"]) {
        $lines[] = "Capped to max fee: " . qb_delivery_pricing_format_price($breakdown["max_delivery_fee"]);
    }

    return $lines;
}

function qb_delivery_pricing_render_breakdown_row()
{
    if (is_admin() && !defined("DOING_AJAX")) {
        return;
    }
    if (!function_exists("WC") || !WC()->cart) {
        return;
    }

    $context = qb_delivery_pricing_get_context();
    $required_keys = array("user_lat", "user_lng", "store_lat", "store_lng");
    foreach ($required_keys as $key) {
        if (!isset($context[$key]) || $context[$key] === "") {
            return;
        }
    }

    $breakdown = qb_delivery_pricing_get_breakdown(
        floatval($context["user_lat"]),
        floatval($context["user_lng"]),
        floatval($context["store_lat"]),
        floatval($context["store_lng"]),
        qb_delivery_pricing_get_order_total(),
        isset($context["store_radius"]) ? floatval($context["store_radius"]) : null
    );

    if (!is_array($breakdown)) {
        return;
    }

    if ($breakdown["status"] === "store_not_available") {
        echo "<tr class=\"qb-delivery-breakdown\"><th>Delivery details</th><td>";
        echo esc_html("Selected store is outside the delivery radius.");
        echo "</td></tr>";
        return;
    }

    $lines = qb_delivery_pricing_get_breakdown_lines($breakdown);
    echo "<tr class=\"qb-delivery-breakdown\"><th>Delivery details</th><td>";
    foreach ($lines as $line) {
        echo "<div>" . esc_html($line) . "</div>";
    }
    echo "</td></tr>";
}

function qb_delivery_pricing_render_breakdown_widget()
{
    if (!function_exists("WC") || !WC()->cart) {
        return;
    }

    $context = qb_delivery_pricing_get_context();
    $required_keys = array("user_lat", "user_lng", "store_lat", "store_lng");
    foreach ($required_keys as $key) {
        if (!isset($context[$key]) || $context[$key] === "") {
            return;
        }
    }

    $breakdown = qb_delivery_pricing_get_breakdown(
        floatval($context["user_lat"]),
        floatval($context["user_lng"]),
        floatval($context["store_lat"]),
        floatval($context["store_lng"]),
        qb_delivery_pricing_get_order_total(),
        isset($context["store_radius"]) ? floatval($context["store_radius"]) : null
    );

    if (!is_array($breakdown) || $breakdown["status"] !== "ok") {
        return;
    }

    $lines = qb_delivery_pricing_get_breakdown_lines($breakdown);
    echo "<div class=\"qb-delivery-breakdown\" style=\"margin:8px 0;\">";
    echo "<strong>Delivery details</strong>";
    foreach ($lines as $line) {
        echo "<div>" . esc_html($line) . "</div>";
    }
    echo "</div>";
}

function apply_delivery_fee()
{
    if (is_admin() && !defined("DOING_AJAX")) {
        return;
    }
    if (!function_exists("WC") || !WC()->cart) {
        return;
    }

    $context = qb_delivery_pricing_get_context();
    $required_keys = array("user_lat", "user_lng", "store_lat", "store_lng");
    foreach ($required_keys as $key) {
        if (!isset($context[$key]) || $context[$key] === "") {
            return;
        }
    }

    $breakdown = qb_delivery_pricing_get_breakdown(
        floatval($context["user_lat"]),
        floatval($context["user_lng"]),
        floatval($context["store_lat"]),
        floatval($context["store_lng"]),
        qb_delivery_pricing_get_order_total(),
        isset($context["store_radius"]) ? floatval($context["store_radius"]) : null
    );

    if (!is_array($breakdown) || $breakdown["status"] === "store_not_available") {
        qb_delivery_pricing_add_notice_once("Selected store is outside the delivery radius.", "error");
        return;
    }

    if ($breakdown["base_fee"] > 0) {
        WC()->cart->add_fee("Delivery Fee", $breakdown["base_fee"]);
    }

    if ($breakdown["applied_small_cart_fee"] > 0) {
        WC()->cart->add_fee("Small Cart Fee", $breakdown["applied_small_cart_fee"]);
    }

    if ($breakdown["surge_amount"] > 0) {
        WC()->cart->add_fee("Surge", $breakdown["surge_amount"]);
    }

    $handling_fee = floatval(get_option("qb_delivery_handling_fee", 0));
    if ($handling_fee > 0) {
        WC()->cart->add_fee("Handling charge", $handling_fee);
    }

    if ($breakdown["free_delivery_discount"] > 0) {
        WC()->cart->add_fee("Free Delivery Discount", -1 * $breakdown["free_delivery_discount"]);
    }

    if ($breakdown["cap_discount"] > 0) {
        WC()->cart->add_fee("Max Fee Discount", -1 * $breakdown["cap_discount"]);
    }
}

function qb_delivery_pricing_validate_store_radius()
{
    $context = qb_delivery_pricing_get_context();
    $required_keys = array("user_lat", "user_lng", "store_lat", "store_lng");
    foreach ($required_keys as $key) {
        if (!isset($context[$key]) || $context[$key] === "") {
            return;
        }
    }

    $fee = calculate_delivery_fee(
        floatval($context["user_lat"]),
        floatval($context["user_lng"]),
        floatval($context["store_lat"]),
        floatval($context["store_lng"]),
        qb_delivery_pricing_get_order_total(),
        isset($context["store_radius"]) ? floatval($context["store_radius"]) : null
    );

    if ($fee === "store_not_available") {
        qb_delivery_pricing_add_notice_once("Selected store is outside the delivery radius.", "error");
    }
}

add_action("woocommerce_cart_calculate_fees", "apply_delivery_fee");
add_action("woocommerce_checkout_process", "qb_delivery_pricing_validate_store_radius");
add_action("woocommerce_cart_totals_after_fees", "qb_delivery_pricing_render_breakdown_row");
add_action("woocommerce_widget_shopping_cart_before_buttons", "qb_delivery_pricing_render_breakdown_widget");
