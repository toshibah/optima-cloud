
<?php
// api/gemini-proxy.php

header('Content-Type: application/json');

// --- IMPORTANT SECURITY NOTE ---
// Your Gemini API key should be set as an environment variable on your hosting server (e.g., in cPanel).
// This is the most secure way to handle API keys.
// The variable name MUST be 'API_KEY'.
$apiKey = getenv('API_KEY');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key is not configured on the server.']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Method Not Allowed']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Invalid JSON payload.']]);
    exit;
}

$fileData = $input['fileData'] ?? null;
$provider = $input['provider'] ?? '';
$budget = $input['budget'] ?? '';
$coreServices = $input['coreServices'] ?? '';
$masterPrompt = $input['masterPrompt'] ?? '';

if (!$fileData || !$masterPrompt) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Missing required fields in request.']]);
    exit;
}

// Construct the prompt and contents for the Gemini API
$textPrompt = "Client-defined parameters:\n- Cloud provider(s): {$provider}\n- Expected monthly budget range: {$budget}\n- Core services in use: {$coreServices}\n\nPlease analyze the provided billing document and generate the report strictly following the OUTPUT FORMAT specified in your system role.";

$contents = [];
if ($fileData['mimeType'] === 'text/csv') {
    $contents[] = [
        'role' => 'user',
        'parts' => [
            ['text' => "---INPUTS RECEIVED:\nBilling Data (CSV Content):\n```csv\n" . $fileData['content'] . "\n```\n" . $textPrompt]
        ]
    ];
} else {
    // For images and PDFs, the content is a base64-encoded data URL
    if (strpos($fileData['content'], ';base64,') === false) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Invalid file content for image or PDF. Expected a base64 data URL.']]);
        exit;
    }
    $base64Data = explode(';base64,', $fileData['content'])[1];
    $contents[] = [
        'role' => 'user',
        'parts' => [
            ['text' => "---\n" . $textPrompt],
            [
                'inline_data' => [
                    'mime_type' => $fileData['mimeType'],
                    'data' => $base64Data
                ]
            ]
        ]
    ];
}

$geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=' . $apiKey;

$payload = [
    'contents' => $contents,
    'system_instruction' => [
        'parts' => [
            ['text' => $masterPrompt]
        ]
    ]
];

// Use cURL to make the request to the Gemini API
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $geminiApiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
// Add timeout to prevent long-running requests
curl_setopt($ch, CURLOPT_TIMEOUT, 120); // 120 seconds timeout

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Failed to connect to the AI service: ' . $curl_error]]);
    exit;
}

if ($httpcode >= 400) {
    http_response_code($httpcode);
    // Forward the error from Gemini API if possible
    $errorResponse = json_decode($response, true);
    if ($errorResponse && isset($errorResponse['error'])) {
        echo json_encode($errorResponse);
    } else {
        echo json_encode(['error' => ['message' => 'The AI service returned an error.', 'details' => $response]]);
    }
    exit;
}

// Forward the successful response from Gemini API to the client
echo $response;

?>
