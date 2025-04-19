CREATE TABLE TempoLiteData (
    id int(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    user_uuid varchar(36) NOT NULL UNIQUE,
    selected_calendar_dates JSON NOT NULL DEFAULT ("[]"),
    selected_timezones JSON NOT NULL DEFAULT ("[]"),
    user_selected_locations JSON NOT NULL DEFAULT ("[]"),
    user_selected_locations_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    notable_events_selected JSON NOT NULL DEFAULT ("[]"),
    notable_events_selected_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    whats_new_opened_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    whats_new_open_time_ms int(11) UNSIGNED NOT NULL DEFAULT 0,
    introduction_opened_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    introduction_open_time_ms int(11) UNSIGNED NOT NULL DEFAULT 0,
    user_guide_opened_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    user_guide_open_time_ms int(11) UNSIGNED NOT NULL DEFAULT 0,
    about_data_opened_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    about_data_open_time_ms int(11) UNSIGNED NOT NULL DEFAULT 0,
    credits_opened_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    credits_open_time_ms int(11) UNSIGNED NOT NULL DEFAULT 0,
    share_button_clicked_count int(11) UNSIGNED NOT NULL DEFAULT 0,
    
    PRIMARY KEY(id),
    INDEX(user_uuid)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci PACK_KEYS=0;
