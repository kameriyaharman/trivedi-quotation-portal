<?php
// Short share link: q.php?t=TOKEN -> opens the client view of the quotation.
// Also gives WhatsApp a nice link preview.
require __DIR__ . '/api/lib.php';
$t = preg_match('/^[a-f0-9]{16,40}$/', $_GET['t'] ?? '') ? $_GET['t'] : '';
$title = 'Quotation';
$desc = '';
$img = '';
try {
    if ($t) {
        $st = db()->prepare('SELECT quote_no, client_name, title FROM quotations WHERE share_token = ?');
        $st->execute([$t]);
        if ($q = $st->fetch()) {
            $s = settings_all();
            $title = ($q['title'] ?: 'Quotation') . ' – ' . $q['quote_no'];
            $desc = 'For ' . $q['client_name'] . ' · ' . trim(($s['company_name'] ?? '') . ' ' . ($s['company_name2'] ?? ''));
            $img = $s['header_image'] ?? '';
        }
    }
} catch (Throwable $e) {}
$proto = (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' || !empty($_SERVER['HTTPS'])) ? 'https' : 'http';
$base = $proto . '://' . ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST']) . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/';
$target = $base . '#/q/' . $t;
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
?><!doctype html>
<html><head><meta charset="utf-8">
<title><?= $h($title) ?></title>
<meta property="og:title" content="<?= $h($title) ?>">
<meta property="og:description" content="<?= $h($desc) ?>">
<?php if ($img): ?><meta property="og:image" content="<?= $h($base . $img) ?>"><?php endif; ?>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=<?= $h($target) ?>">
</head><body><script>location.replace(<?= json_encode($target) ?>)</script>
<a href="<?= $h($target) ?>">Open quotation</a></body></html>
