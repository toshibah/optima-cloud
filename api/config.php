<?php
header('Content-Type: application/javascript');

// This script provides frontend configuration from server-side environment variables.
// It's crucial to only expose public keys or non-sensitive configuration here.

// Retrieve environment variables, providing a fallback to an empty string.
// json_encode will then correctly handle them as "" in the output JSON.
$publicKey = json_encode(getenv('EMAILJS_PUBLIC_KEY') ?: '');
$serviceId = json_encode(getenv('EMAILJS_SERVICE_ID') ?: '');
$templateId = json_encode(getenv('EMAILJS_TEMPLATE_ID') ?: '');

echo "
// This configuration is generated server-side for security.
window.APP_CONFIG = {
  EMAILJS_PUBLIC_KEY: $publicKey,
  EMAILJS_SERVICE_ID: $serviceId,
  EMAILJS_TEMPLATE_ID: $templateId
};
";
?>