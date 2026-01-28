CREATE TABLE Classes (
    id int(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
    name varchar(32) NOT NULL,
    educator_id int(11) UNSIGNED NOT NULL,
    created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active tinyint(1) NOT NULL DEFAULT 0,
    code varchar(50) NOT NULL UNIQUE,
    asynchronous tinyint(1) NOT NULL DEFAULT 0,
    test tinyint(1) NOT NULL DEFAULT 0,
    seed tinyint(1) NOT NULL DEFAULT 0,
    updated datetime DEFAULT NULL,
    expected_size int(11) UNSIGNED NOT NULL,
    small_class tinyint(1) GENERATED ALWAYS AS (expected_size < 15) VIRTUAL,
    status ENUM("seed", "real_good_data", "real_bad_data", "test_good_data", "test_bad_data", "unknown") DEFAULT NULL,
 
    PRIMARY KEY(id),
    INDEX(educator_id),
    INDEX(code),
    UNIQUE KEY unique_entry (educator_id, name),
    FOREIGN KEY(educator_id) 
      REFERENCES Educators(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci PACK_KEYS=0;
