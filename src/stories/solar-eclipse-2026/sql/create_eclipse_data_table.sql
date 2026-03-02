CREATE TABLE SolarEclipse2026Data (
	id int(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
	user_uuid varchar(36) NOT NULL UNIQUE,
    user_selected_locations JSON NOT NULL,
    user_selected_locations_count INT NOT NULL,
    cloud_cover_selected_locations JSON NOT NULL,
    cloud_cover_selected_locations_count INT NOT NULL,
    text_search_selected_locations JSON NOT NULL, 
    text_search_selected_locations_count INT NOT NULL,
    app_time_ms INT NOT NULL DEFAULT 0,
    info_time_ms INT NOT NULL DEFAULT 0,
    weather_info_time_ms INT NOT NULL DEFAULT 0,
    user_guide_time_ms INT NOT NULL DEFAULT 0,
    eclipse_timer_time_ms INT NOT NULL DEFAULT 0,
    forecast_info_time_ms INT NOT NULL DEFAULT 0,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY(id),
    INDEX(user_uuid)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci PACK_KEYS=0;
