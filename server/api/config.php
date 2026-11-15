<?php
// ---------------------------------------------------------------
// Database settings.
// On BigRock: fill in the values below (cPanel > MySQL Databases).
// On Railway: leave as is — values come from environment variables.
// ---------------------------------------------------------------
return [
    'db_host' => getenv('MYSQLHOST') ?: 'localhost',
    'db_port' => getenv('MYSQLPORT') ?: '3306',
    'db_name' => getenv('MYSQLDATABASE') ?: 'your_database_name',
    'db_user' => getenv('MYSQLUSER') ?: 'your_database_user',
    'db_pass' => getenv('MYSQLPASSWORD') ?: 'your_database_password',

    // Create tables automatically on first run if they don't exist
    'auto_install' => true,

    // Max upload size per image (MB) and resize limit (px)
    'max_upload_mb' => 8,
    'max_image_px' => 1400,
];
