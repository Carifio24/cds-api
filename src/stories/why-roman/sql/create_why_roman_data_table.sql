CREATE TABLE WhyRomanData (
    id INT UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    user_uuid varchar(36) NOT NULL UNIQUE,
    test TINYINT UNSIGNED NOT NULL DEFAULT 0,
    app_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
    max_andromeda_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
    tour_restarted_count INT UNSIGNED NOT NULL DEFAULT 0,
    side_controls_opened_count INT UNSIGNED NOT NULL DEFAULT 0,
    zoom_to_pixel_scale_count INT UNSIGNED NOT NULL DEFAULT 0,
    about_roman_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
    user_guide_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
    controls_open_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
    slider_min_press_count INT UNSIGNED NOT NULL DEFAULT 0,
    slider_max_press_count INT UNSIGNED NOT NULL DEFAULT 0,
    slider_label_press_count INT UNSIGNED NOT NULL DEFAULT 0,
    slider_move_count INT UNSIGNED NOT NULL DEFAULT 0,
    footprints_toggle_count JSON NOT NULL DEFAULT ((JSON_OBJECT())),
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY(id),
    INDEX(user_uuid)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci PACK_KEYS=0;
