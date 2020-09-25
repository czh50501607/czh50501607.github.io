<?php
$data = '{
  "success": '.true.',
  "message": "you success connected"
}';

header('Content-type:text/json');
echo json_encode($data);
