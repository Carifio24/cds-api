CREATE TABLE Students (
    id int(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    verified tinyint(2) NOT NULL DEFAULT 0,
    email varchar(50) COLLATE utf8_unicode_ci NOT NULL UNIQUE,
    verification_code varchar(50) COLLATE utf8_unicode_ci NOT NULL UNIQUE,
    username varchar(50) COLLATE utf8_unicode_ci NOT NULL UNIQUE,
    password varchar(64) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
    institution varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
    age int(5),
    gender varchar(20) COLLATE utf8_unicode_ci,
    ip varchar(50) COLLATE utf8_unicode_ci,
    lat varchar(20) COLLATE utf8_unicode_ci,
    lon varchar(20) COLLATE utf8_unicode_ci,
    profile_created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visits int(11) NOT NULL DEFAULT 0,
    last_visit datetime NOT NULL,
    last_visit_ip varchar(50) COLLATE utf8_unicode_ci,

    PRIMARY KEY(id),
    INDEX(username),
    INDEX(email)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci PACK_KEYS=0;
