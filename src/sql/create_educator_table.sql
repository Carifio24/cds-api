CREATE TABLE Educators (
    id int(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    verified tinyint(2) NOT NULL DEFAULT 0,
    email varchar(50) COLLATE utf8_unicode_ci NOT NULL UNIQUE,
    verification_code varchar(50) COLLATE utf8_unicode_ci NOT NULL UNIQUE,
    first_name varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
    last_name varchar(100) NOT NULL COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
    password varchar(64) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
    institution varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT NULL,
    age int(5) DEFAULT NULL,
    gender varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
    ip varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
    lat varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
    lon varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
    profile_created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visits int(11) NOT NULL DEFAULT 0,
    last_visit datetime NOT NULL,
    last_visit_ip varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
    username varchar(64) COLLATE utf8_unicode_ci NOT NULL UNIQUE,Class

    PRIMARY KEY(id),
    INDEX(last_name)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci PACK_KEYS=0;
