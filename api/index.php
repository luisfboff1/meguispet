<?php
// Simple entrypoint to satisfy build verification and provide a basic API status response.
header('Content-Type: application/json');
http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'service' => 'MeguisPet API',
    'timestamp' => date('c'),
]);
