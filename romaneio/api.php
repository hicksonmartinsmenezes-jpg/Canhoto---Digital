<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';
$dataDir = __DIR__ . '/data/';
$uploadsDir = __DIR__ . '/uploads/';

// Garante que os diretórios existam
if (!is_dir($dataDir)) mkdir($dataDir, 0777, true);
if (!is_dir($uploadsDir . 'fotos/')) mkdir($uploadsDir . 'fotos/', 0777, true);
if (!is_dir($uploadsDir . 'assinaturas/')) mkdir($uploadsDir . 'assinaturas/', 0777, true);

// 1. CARREGAR TUDO
if ($action === 'load_all') {
    $users = file_exists($dataDir . 'usuarios.json') ? json_decode(file_get_contents($dataDir . 'usuarios.json'), true) : [];
    $vehicles = file_exists($dataDir . 'veiculos.json') ? json_decode(file_get_contents($dataDir . 'veiculos.json'), true) : [];
    $orders = file_exists($dataDir . 'encomendas.json') ? json_decode(file_get_contents($dataDir . 'encomendas.json'), true) : [];

    echo json_encode([
        'status' => 'success',
        'data' => [
            'users' => $users ?: [],
            'vehicles' => $vehicles ?: [],
            'orders' => $orders ?: []
        ]
    ]);
    exit;
}

// Recebe os dados enviados via POST (JSON)
$input = json_decode(file_get_contents('php://input'), true);

// 2. SALVAR ARQUIVOS JSON ESPECÍFICOS
if ($action === 'save_entity') {
    $entity = $input['entity'] ?? '';
    $payload = $input['payload'] ?? null;

    if (!in_array($entity, ['usuarios', 'veiculos', 'encomendas']) || $payload === null) {
        echo json_encode(['status' => 'error', 'message' => 'Entidade inválida']);
        exit;
    }

    file_put_contents($dataDir . $entity . '.json', json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['status' => 'success']);
    exit;
}

// 3. ENVIAR COMPROVANTE (SALVA A IMAGEM COMO ARQUIVO REAL NO DISCO)
if ($action === 'submit_protocol') {
    $orderId = $input['orderId'] ?? '';
    $photoBase64 = $input['photo'] ?? null;
    $signatureBase64 = $input['signature'] ?? null;

    if (!$orderId) {
        echo json_encode(['status' => 'error', 'message' => 'ID da ordem ausente']);
        exit;
    }

    $orders = file_exists($dataDir . 'encomendas.json') ? json_decode(file_get_contents($dataDir . 'encomendas.json'), true) : [];
    $orderIndex = -1;

    foreach ($orders as $idx => $ord) {
        if ($ord['id'] === $orderId) {
            $orderIndex = $idx;
            break;
        }
    }

    if ($orderIndex === -1) {
        echo json_encode(['status' => 'error', 'message' => 'Encomenda não encontrada']);
        exit;
    }

    // Salva a foto física na pasta uploads/fotos/
    $photoPath = null;
    if ($photoBase64 && preg_match('/^data:image\/(\w+);base64,/', $photoBase64, $type)) {
        $data = substr($photoBase64, strpos($photoBase64, ',') + 1);
        $fileName = 'foto_' . $orderId . '_' . time() . '.' . strtolower($type[1]);
        file_put_contents($uploadsDir . 'fotos/' . $fileName, base64_decode($data));
        $photoPath = 'uploads/fotos/' . $fileName;
    }

    // Salva a assinatura física na pasta uploads/assinaturas/
    $signaturePath = null;
    if ($signatureBase64 && preg_match('/^data:image\/(\w+);base64,/', $signatureBase64, $type)) {
        $data = substr($signatureBase64, strpos($signatureBase64, ',') + 1);
        $fileName = 'assinatura_' . $orderId . '_' . time() . '.' . strtolower($type[1]);
        file_put_contents($uploadsDir . 'assinaturas/' . $fileName, base64_decode($data));
        $signaturePath = 'uploads/assinaturas/' . $fileName;
    }

    // Atualiza a encomenda no JSON
    $orders[$orderIndex]['status'] = 'completed';
    $orders[$orderIndex]['photo'] = $photoPath;
    $orders[$orderIndex]['signature'] = $signaturePath;
    $orders[$orderIndex]['deliveredAt'] = date('d/m/Y H:i:s');

    file_put_contents($dataDir . 'encomendas.json', json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['status' => 'success', 'data' => $orders[$orderIndex]]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Ação desconhecida']);