
<?php
// api/gemini-proxy.php
// This script functions as a JSON API endpoint for the React frontend.

session_start();
header('Content-Type: application/json');

function send_json_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// --- 1. GET API KEY ---
$apiKey = getenv('API_KEY');
if (!$apiKey) {
    send_json_error('API key is not configured on the server.', 500);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_error('Method Not Allowed', 405);
}

// --- 2. RETRIEVE FORM DATA & FILES ---
$provider = $_POST['provider'] ?? '';
$budget = $_POST['budget'] ?? '';
$coreServices = $_POST['services'] ?? '';
$selectedTier = $_POST['tier'] ?? '';
$uploadedFiles = $_FILES['billingFile'] ?? null;

if (!$provider || !$budget || !$coreServices || !$selectedTier || !$uploadedFiles || $uploadedFiles['error'][0] === UPLOAD_ERR_NO_FILE) {
    send_json_error('All fields and a file upload are required.');
}

// --- 3. PROCESS FILES AND CONSTRUCT GEMINI PAYLOAD ---
$masterPrompt = file_get_contents('../services/master_prompt.txt');
if ($masterPrompt === false) {
    send_json_error('Server misconfiguration: Could not read master prompt.', 500);
}

$textPrompt = "Client-defined parameters:\n- Cloud provider(s): {$provider}\n- Expected monthly budget range: {$budget}\n- Core services in use: {$coreServices}\n\nPlease analyze the provided billing document(s) and generate the report strictly following the OUTPUT FORMAT specified in your system role.";
$parts = [['text' => $textPrompt]];
$combinedCsvContent = "";

try {
    foreach ($uploadedFiles['tmp_name'] as $key => $tmpName) {
        if (!is_uploaded_file($tmpName)) continue;
        
        $mimeType = mime_content_type($tmpName);
        $fileContent = file_get_contents($tmpName);
        
        if ($mimeType === 'text/plain' || $mimeType === 'text/csv') {
            $combinedCsvContent .= $fileContent . "\n\n";
        } else if (in_array($mimeType, ['image/jpeg', 'image/png', 'application/pdf'])) {
            $base64Data = base64_encode($fileContent);
            $parts[] = ['inline_data' => ['mime_type' => $mimeType, 'data' => $base64Data]];
        }
    }
} catch (Exception $e) {
    send_json_error('Error processing uploaded files: ' . $e->getMessage(), 500);
}


if (!empty($combinedCsvContent)) {
    array_unshift($parts, ['text' => "---INPUTS RECEIVED:\nBilling Data (CSV Content):\n```csv\n" . $combinedCsvContent . "\n```\n"]);
}

$payload = [
    'contents' => [['role' => 'user', 'parts' => $parts]],
    'system_instruction' => ['parts' => [['text' => $masterPrompt]]],
    'generationConfig' => [
        'response_mime_type' => 'text/plain',
    ]
];

// --- 4. CALL GEMINI API (cURL) ---
$geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=' . $apiKey;
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $geminiApiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// --- 5. HANDLE RESPONSE AND RENDER REPORT ---
if ($curl_error) {
    send_json_error('API communication error: ' . $curl_error, 502);
}

$result = json_decode($response, true);

if ($httpcode >= 400) {
    $api_error = $result['error']['message'] ?? 'The AI service returned an error.';
    send_json_error('AI API Error: ' . $api_error, $httpcode);
}

$report_content = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

if ($report_content) {
    echo json_encode(['report' => $report_content]);
} else {
    send_json_error('Could not extract a valid report from the AI response.', 500);
}

?>
