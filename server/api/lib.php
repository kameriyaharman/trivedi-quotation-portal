<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

function cfg(string $k)
{
    static $c = null;
    if ($c === null) $c = require __DIR__ . '/config.php';
    return $c[$k] ?? null;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = 'mysql:host=' . cfg('db_host') . ';port=' . cfg('db_port') . ';dbname=' . cfg('db_name') . ';charset=utf8mb4';
    $pdo = new PDO($dsn, cfg('db_user'), cfg('db_pass'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+05:30'");
    if (cfg('auto_install')) auto_install($pdo);
    return $pdo;
}

function auto_install(PDO $pdo): void
{
    $exists = $pdo->query("SHOW TABLES LIKE 'quotations'")->fetchColumn();
    if ($exists) return;
    $sql = file_get_contents(dirname(__DIR__) . '/install/schema.sql');
    $sql = preg_replace('/^--.*$/m', '', $sql);
    foreach (preg_split('/;\s*\n/', $sql) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt !== '') $pdo->exec($stmt);
    }
}

function out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    out(['error' => $msg], $code);
}

function body(): array
{
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input');
    $b = $raw ? (json_decode($raw, true) ?: []) : [];
    return $b;
}

function input(string $k, $default = null)
{
    $b = body();
    if (array_key_exists($k, $b)) return $b[$k];
    return $_GET[$k] ?? $_POST[$k] ?? $default;
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('TQSESS');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 14,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
    ]);
    ini_set('session.gc_maxlifetime', (string)(60 * 60 * 24 * 14));
    session_start();
}

function current_user(): ?array
{
    start_session();
    return $_SESSION['user'] ?? null;
}

function require_auth(): array
{
    $u = current_user();
    if (!$u) fail('Please login again', 401);
    return $u;
}

function settings_all(): array
{
    $rows = db()->query('SELECT k, v FROM settings')->fetchAll();
    $s = [];
    foreach ($rows as $r) $s[$r['k']] = $r['v'];
    return $s;
}

function setting_set(string $k, ?string $v): void
{
    $st = db()->prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
    $st->execute([$k, $v]);
}

function token(int $len = 24): string
{
    return substr(bin2hex(random_bytes($len)), 0, $len);
}

function str_or_null($v): ?string
{
    if ($v === null) return null;
    $v = trim((string)$v);
    return $v === '' ? null : $v;
}

/** Saves an uploaded image under uploads/YYYY/MM, resizing large images. Returns relative path. */
function save_upload(array $f): string
{
    if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('Upload failed (code ' . ($f['error'] ?? '?') . ')');
    if ($f['size'] > cfg('max_upload_mb') * 1024 * 1024) fail('Image is larger than ' . cfg('max_upload_mb') . ' MB');
    $info = @getimagesize($f['tmp_name']);
    if (!$info) fail('File is not a valid image');
    $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
    $ext = $map[$info[2]] ?? null;
    if (!$ext) fail('Only JPG, PNG, WEBP or GIF images are allowed');

    $rel = 'uploads/' . date('Y') . '/' . date('m');
    $dir = dirname(__DIR__) . '/' . $rel;
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) fail('Cannot create upload folder', 500);
    $name = date('His') . '-' . token(10) . '.' . $ext;
    $dest = $dir . '/' . $name;

    $max = (int)cfg('max_image_px');
    $resized = false;
    if (function_exists('imagecreatetruecolor') && ($info[0] > $max || $info[1] > $max) && $ext !== 'gif') {
        $src = null;
        if ($ext === 'jpg') $src = @imagecreatefromjpeg($f['tmp_name']);
        if ($ext === 'png') $src = @imagecreatefrompng($f['tmp_name']);
        if ($ext === 'webp' && function_exists('imagecreatefromwebp')) $src = @imagecreatefromwebp($f['tmp_name']);
        if ($src) {
            $r = min($max / $info[0], $max / $info[1]);
            $w = (int)round($info[0] * $r);
            $h = (int)round($info[1] * $r);
            $dst = imagecreatetruecolor($w, $h);
            if ($ext !== 'jpg') {
                imagealphablending($dst, false);
                imagesavealpha($dst, true);
            }
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $w, $h, $info[0], $info[1]);
            if ($ext === 'jpg') $resized = imagejpeg($dst, $dest, 85);
            if ($ext === 'png') $resized = imagepng($dst, $dest, 6);
            if ($ext === 'webp') $resized = imagewebp($dst, $dest, 85);
        }
    }
    if (!$resized && !move_uploaded_file($f['tmp_name'], $dest)) fail('Could not save image', 500);
    return $rel . '/' . $name;
}

function quote_row(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['amount'] = (float)$r['amount'];
    $r['wood'] = json_decode($r['wood_json'] ?? '', true) ?: null;
    $r['items'] = json_decode($r['items_json'] ?? '', true) ?: [];
    unset($r['wood_json'], $r['items_json']);
    return $r;
}

/** @return array{0:string,1:int} */
function next_quote_no(array $s): array
{
    $n = max(1, (int)($s['next_number'] ?? 1));
    $pad = max(1, (int)($s['number_padding'] ?? 3));
    $prefix = $s['quote_prefix'] ?? 'Q/';
    $st = db()->prepare('SELECT COUNT(*) FROM quotations WHERE quote_no = ?');
    while (true) {
        $no = $prefix . str_pad((string)$n, $pad, '0', STR_PAD_LEFT);
        $st->execute([$no]);
        if (!(int)$st->fetchColumn()) return [$no, $n];
        $n++;
    }
}
