<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

set_exception_handler(function (Throwable $e) {
    error_log('[quote-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $msg = $e instanceof PDOException ? 'Database error: ' . $e->getMessage() : $e->getMessage();
    out(['error' => $msg], 500);
});

$r = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Simple CSRF guard: state-changing calls must be POST from same site (JSON or multipart from our app)
if ($method === 'POST') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '';
    $hosts = array_map(fn($h) => strtolower(explode(':', trim($h))[0]), [$host, $_SERVER['HTTP_HOST'] ?? '']);
    if ($origin && !in_array(strtolower((string)parse_url($origin, PHP_URL_HOST)), $hosts, true)) {
        fail('Cross-site request blocked', 403);
    }
}

$QUOTE_FIELDS = ['quote_no', 'quote_date', 'client_name', 'client_phone', 'client_email', 'client_address', 'site_location',
    'title', 'intro', 'acc_heading', 'amount_label', 'notes', 'terms', 'payment_terms', 'closing', 'status'];
$STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

switch ($r) {

    // ---------------- AUTH ----------------
    case 'auth.login':
        $u = trim((string)input('username', ''));
        $p = (string)input('password', '');
        $st = db()->prepare('SELECT * FROM users WHERE username = ?');
        $st->execute([$u]);
        $row = $st->fetch();
        if (!$row || !password_verify($p, $row['password_hash'])) {
            usleep(400000);
            fail('Wrong username or password', 401);
        }
        start_session();
        session_regenerate_id(true);
        $_SESSION['user'] = ['id' => (int)$row['id'], 'name' => $row['name'], 'username' => $row['username']];
        out(['user' => $_SESSION['user']]);

    case 'auth.logout':
        start_session();
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);

    case 'auth.me':
        $u = current_user();
        if (!$u) fail('Not logged in', 401);
        out(['user' => $u]);

    case 'auth.password':
        $u = require_auth();
        $cur = (string)input('current', '');
        $new = (string)input('new', '');
        $newUser = trim((string)input('username', $u['username']));
        if (strlen($new) < 6) fail('New password must be at least 6 characters');
        if ($newUser === '') fail('Username is required');
        $st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $st->execute([$u['id']]);
        if (!password_verify($cur, (string)$st->fetchColumn())) fail('Current password is wrong');
        $st = db()->prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?');
        $st->execute([$newUser, password_hash($new, PASSWORD_BCRYPT), $u['id']]);
        $_SESSION['user']['username'] = $newUser;
        out(['ok' => true]);

    // ---------------- DASHBOARD ----------------
    case 'dashboard.stats':
        require_auth();
        $pdo = db();
        $one = fn($sql, $p = []) => (function () use ($pdo, $sql, $p) {
            $st = $pdo->prepare($sql);
            $st->execute($p);
            return $st->fetch();
        })();
        $total = $one('SELECT COUNT(*) c, COALESCE(SUM(amount),0) a FROM quotations');
        $month = $one("SELECT COUNT(*) c, COALESCE(SUM(amount),0) a FROM quotations WHERE quote_date >= ?", [date('Y-m-01')]);
        $today = $one("SELECT COUNT(*) c FROM quotations WHERE DATE(created_at) = ?", [date('Y-m-d')]);
        $items = $one('SELECT COUNT(*) c FROM items WHERE is_active = 1');
        $status = [];
        foreach ($pdo->query('SELECT status, COUNT(*) c, COALESCE(SUM(amount),0) a FROM quotations GROUP BY status') as $row) {
            $status[$row['status']] = ['count' => (int)$row['c'], 'amount' => (float)$row['a']];
        }
        $series = [];
        $st = $pdo->prepare("SELECT DATE_FORMAT(quote_date, '%Y-%m') m, COUNT(*) c, COALESCE(SUM(amount),0) a FROM quotations WHERE quote_date >= ? GROUP BY m");
        $from = date('Y-m-01', strtotime('-5 months', strtotime(date('Y-m-01'))));
        $st->execute([$from]);
        $byM = [];
        foreach ($st as $row) $byM[$row['m']] = $row;
        for ($i = 5; $i >= 0; $i--) {
            $m = date('Y-m', strtotime("-$i months", strtotime(date('Y-m-01'))));
            $series[] = ['month' => $m, 'count' => (int)($byM[$m]['c'] ?? 0), 'amount' => (float)($byM[$m]['a'] ?? 0)];
        }
        $recent = $pdo->query('SELECT id, quote_no, quote_date, client_name, client_phone, site_location, amount, status, share_token, created_at FROM quotations ORDER BY created_at DESC, id DESC LIMIT 8')->fetchAll();
        foreach ($recent as &$x) { $x['id'] = (int)$x['id']; $x['amount'] = (float)$x['amount']; }
        out([
            'total' => ['count' => (int)$total['c'], 'amount' => (float)$total['a']],
            'month' => ['count' => (int)$month['c'], 'amount' => (float)$month['a']],
            'today' => (int)$today['c'],
            'items' => (int)$items['c'],
            'status' => $status,
            'series' => $series,
            'recent' => $recent,
        ]);

    // ---------------- ITEMS MASTER ----------------
    case 'items.list':
        require_auth();
        $q = trim((string)input('q', ''));
        $onlyActive = input('active') === '1';
        $sql = 'SELECT * FROM items WHERE 1';
        $p = [];
        if ($q !== '') { $sql .= ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)'; array_push($p, "%$q%", "%$q%", "%$q%"); }
        if ($onlyActive) $sql .= ' AND is_active = 1';
        $sql .= ' ORDER BY sort_order ASC, name ASC';
        $st = db()->prepare($sql);
        $st->execute($p);
        $rows = $st->fetchAll();
        foreach ($rows as &$x) { $x['id'] = (int)$x['id']; $x['is_active'] = (int)$x['is_active']; $x['sort_order'] = (int)$x['sort_order']; }
        out(['items' => $rows]);

    case 'items.save':
        require_auth();
        $id = (int)input('id', 0);
        $name = trim((string)input('name', ''));
        if ($name === '') fail('Item name is required');
        $vals = [$name, str_or_null(input('image')), str_or_null(input('description')), str_or_null(input('default_qty')),
            str_or_null(input('category')), (int)(input('is_active', 1) ? 1 : 0), (int)input('sort_order', 0)];
        if ($id) {
            $st = db()->prepare('UPDATE items SET name=?, image=?, description=?, default_qty=?, category=?, is_active=?, sort_order=?, updated_at=NOW() WHERE id=?');
            $st->execute([...$vals, $id]);
        } else {
            $st = db()->prepare('INSERT INTO items (name, image, description, default_qty, category, is_active, sort_order) VALUES (?,?,?,?,?,?,?)');
            $st->execute($vals);
            $id = (int)db()->lastInsertId();
        }
        out(['id' => $id]);

    case 'items.bulk':
        require_auth();
        $rows = input('items', []);
        if (!is_array($rows) || !$rows) fail('No items to add');
        $pdo = db();
        $max = (int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM items')->fetchColumn();
        $st = $pdo->prepare('INSERT INTO items (name, image, description, default_qty, category, sort_order) VALUES (?,?,?,?,?,?)');
        $pdo->beginTransaction();
        $n = 0;
        foreach ($rows as $row) {
            $name = trim((string)($row['name'] ?? ''));
            if ($name === '') continue;
            $st->execute([$name, str_or_null($row['image'] ?? null), str_or_null($row['description'] ?? null),
                str_or_null($row['default_qty'] ?? null), str_or_null($row['category'] ?? null), ++$max]);
            $n++;
        }
        $pdo->commit();
        out(['added' => $n]);

    case 'items.delete':
        require_auth();
        $st = db()->prepare('DELETE FROM items WHERE id = ?');
        $st->execute([(int)input('id')]);
        out(['ok' => true]);

    // ---------------- UPLOAD ----------------
    case 'upload':
        require_auth();
        if (empty($_FILES['file'])) fail('No file received');
        out(['path' => save_upload($_FILES['file'])]);

    // ---------------- QUOTATIONS ----------------
    case 'quotes.defaults':
        require_auth();
        $s = settings_all();
        [$no] = next_quote_no($s);
        out([
            'quote_no' => $no,
            'quote_date' => date('Y-m-d'),
            'client_name' => '', 'client_phone' => '', 'client_email' => '', 'client_address' => '', 'site_location' => '',
            'title' => $s['default_title'] ?? '',
            'intro' => $s['default_intro'] ?? '',
            'wood' => json_decode($s['default_wood_json'] ?? '', true) ?: ['show' => false, 'heading' => '', 'left' => ['title' => '', 'image' => ''], 'right' => ['title' => '', 'image' => ''], 'rows' => []],
            'acc_heading' => $s['default_acc_heading'] ?? 'ACCESSORIES',
            'items' => [],
            'amount_label' => $s['default_amount_label'] ?? '',
            'amount' => 0,
            'notes' => $s['default_notes'] ?? '',
            'terms' => $s['default_terms'] ?? '',
            'payment_terms' => $s['default_payment_terms'] ?? '',
            'closing' => $s['default_closing'] ?? '',
            'status' => 'draft',
        ]);

    case 'quotes.list':
        require_auth();
        $q = trim((string)input('q', ''));
        $status = (string)input('status', '');
        $from = (string)input('from', '');
        $to = (string)input('to', '');
        $page = max(1, (int)input('page', 1));
        $per = min(100, max(5, (int)input('per', 20)));
        $where = ' WHERE 1';
        $p = [];
        if ($q !== '') {
            $where .= ' AND (quote_no LIKE ? OR client_name LIKE ? OR client_phone LIKE ? OR site_location LIKE ?)';
            array_push($p, "%$q%", "%$q%", "%$q%", "%$q%");
        }
        if (in_array($status, $STATUSES, true)) { $where .= ' AND status = ?'; $p[] = $status; }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) { $where .= ' AND quote_date >= ?'; $p[] = $from; }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) { $where .= ' AND quote_date <= ?'; $p[] = $to; }
        $st = db()->prepare('SELECT COUNT(*) c, COALESCE(SUM(amount),0) a FROM quotations' . $where);
        $st->execute($p);
        $tot = $st->fetch();
        $st = db()->prepare('SELECT id, quote_no, quote_date, client_name, client_phone, site_location, title, amount, status, share_token, created_at, updated_at FROM quotations'
            . $where . ' ORDER BY quote_date DESC, id DESC LIMIT ' . $per . ' OFFSET ' . (($page - 1) * $per));
        $st->execute($p);
        $rows = $st->fetchAll();
        foreach ($rows as &$x) { $x['id'] = (int)$x['id']; $x['amount'] = (float)$x['amount']; }
        out(['rows' => $rows, 'total' => (int)$tot['c'], 'sum' => (float)$tot['a'], 'page' => $page, 'per' => $per]);

    case 'quotes.get':
        require_auth();
        $st = db()->prepare('SELECT * FROM quotations WHERE id = ?');
        $st->execute([(int)input('id')]);
        $row = $st->fetch();
        if (!$row) fail('Quotation not found', 404);
        out(['quote' => quote_row($row)]);

    case 'quotes.save':
        $u = require_auth();
        $b = body();
        $id = (int)($b['id'] ?? 0);
        $d = [];
        foreach ($QUOTE_FIELDS as $f) $d[$f] = isset($b[$f]) ? trim((string)$b[$f]) : null;
        if (!$d['client_name']) fail('Client name is required');
        if (!$d['quote_date'] || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $d['quote_date'])) $d['quote_date'] = date('Y-m-d');
        if (!in_array($d['status'], $STATUSES, true)) $d['status'] = 'draft';
        $d['amount'] = round((float)($b['amount'] ?? 0), 2);
        $d['wood_json'] = json_encode($b['wood'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $items = [];
        foreach (($b['items'] ?? []) as $it) {
            if (!is_array($it) || trim((string)($it['name'] ?? '')) === '') continue;
            $items[] = [
                'item_id' => isset($it['item_id']) ? (int)$it['item_id'] : null,
                'name' => trim((string)$it['name']),
                'image' => (string)($it['image'] ?? ''),
                'qty' => (string)($it['qty'] ?? ''),
                'note' => (string)($it['note'] ?? ''),
            ];
        }
        $d['items_json'] = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $pdo = db();
        $pdo->beginTransaction();
        $s = settings_all();
        $usedAuto = null;
        if (!$d['quote_no']) {
            [$d['quote_no'], $usedAuto] = next_quote_no($s);
        }
        $st = $pdo->prepare('SELECT id FROM quotations WHERE quote_no = ? AND id <> ?');
        $st->execute([$d['quote_no'], $id]);
        if ($st->fetchColumn()) { $pdo->rollBack(); fail('Quotation number ' . $d['quote_no'] . ' already exists'); }

        $cols = array_keys($d);
        if ($id) {
            $set = implode(', ', array_map(fn($c) => "$c = ?", $cols));
            $st = $pdo->prepare("UPDATE quotations SET $set, updated_at = NOW() WHERE id = ?");
            $st->execute([...array_values($d), $id]);
        } else {
            $d['share_token'] = token(24);
            $d['created_by'] = $u['id'];
            $cols = array_keys($d);
            $st = $pdo->prepare('INSERT INTO quotations (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')');
            $st->execute(array_values($d));
            $id = (int)$pdo->lastInsertId();
            // advance counter if the number follows the prefix pattern
            $prefix = $s['quote_prefix'] ?? '';
            if ($usedAuto === null && $prefix !== '' && str_starts_with($d['quote_no'], $prefix) && ctype_digit(substr($d['quote_no'], strlen($prefix)))) {
                $usedAuto = (int)substr($d['quote_no'], strlen($prefix));
            }
            if ($usedAuto !== null && $usedAuto >= (int)($s['next_number'] ?? 1)) setting_set('next_number', (string)($usedAuto + 1));
        }
        $pdo->commit();
        $st = $pdo->prepare('SELECT * FROM quotations WHERE id = ?');
        $st->execute([$id]);
        out(['quote' => quote_row($st->fetch())]);

    case 'quotes.status':
        require_auth();
        $sv = (string)input('status');
        if (!in_array($sv, $STATUSES, true)) fail('Invalid status');
        $st = db()->prepare('UPDATE quotations SET status = ?, updated_at = NOW() WHERE id = ?');
        $st->execute([$sv, (int)input('id')]);
        out(['ok' => true]);

    case 'quotes.duplicate':
        $u = require_auth();
        $pdo = db();
        $st = $pdo->prepare('SELECT * FROM quotations WHERE id = ?');
        $st->execute([(int)input('id')]);
        $row = $st->fetch();
        if (!$row) fail('Quotation not found', 404);
        $s = settings_all();
        [$no, $n] = next_quote_no($s);
        unset($row['id'], $row['created_at'], $row['updated_at']);
        $row['quote_no'] = $no;
        $row['quote_date'] = date('Y-m-d');
        $row['status'] = 'draft';
        $row['share_token'] = token(24);
        $row['created_by'] = $u['id'];
        $cols = array_keys($row);
        $st = $pdo->prepare('INSERT INTO quotations (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')');
        $st->execute(array_values($row));
        $newId = (int)$pdo->lastInsertId();
        if ($n >= (int)($s['next_number'] ?? 1)) setting_set('next_number', (string)($n + 1));
        out(['id' => $newId]);

    case 'quotes.delete':
        require_auth();
        $st = db()->prepare('DELETE FROM quotations WHERE id = ?');
        $st->execute([(int)input('id')]);
        out(['ok' => true]);

    // ---------------- PUBLIC (client link) ----------------
    case 'public.quote':
        $t = (string)input('t', '');
        if (!preg_match('/^[a-f0-9]{16,40}$/', $t)) fail('Invalid link', 404);
        $st = db()->prepare('SELECT * FROM quotations WHERE share_token = ?');
        $st->execute([$t]);
        $row = $st->fetch();
        if (!$row) fail('Quotation not found', 404);
        $q = quote_row($row);
        unset($q['created_by']);
        $s = settings_all();
        $company = array_intersect_key($s, array_flip(['company_name', 'company_name2', 'tagline', 'phones', 'locations', 'logo', 'header_image', 'signature_label', 'footer_text']));
        out(['quote' => $q, 'company' => $company]);

    // ---------------- SETTINGS ----------------
    case 'settings.get':
        require_auth();
        out(['settings' => settings_all()]);

    case 'settings.save':
        require_auth();
        $allowed = ['company_name', 'company_name2', 'tagline', 'phones', 'locations', 'logo', 'header_image', 'signature_label', 'footer_text',
            'quote_prefix', 'next_number', 'number_padding', 'default_title', 'default_intro', 'default_acc_heading', 'default_amount_label',
            'default_wood_json', 'default_notes', 'default_terms', 'default_payment_terms', 'default_closing', 'whatsapp_template'];
        $b = body();
        foreach ($allowed as $k) {
            if (array_key_exists($k, $b)) setting_set($k, is_string($b[$k]) ? $b[$k] : json_encode($b[$k], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        out(['settings' => settings_all()]);

    default:
        fail('Unknown route', 404);
}
