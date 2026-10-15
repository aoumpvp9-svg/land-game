$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:8085/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Server running at $prefix"

$baseDir = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path)) {
            $path = "index.html"
        }

        $filePath = Join-Path $baseDir $path
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".png")) { $response.ContentType = "image/png" }
            elseif ($filePath.EndsWith(".svg")) { $response.ContentType = "image/svg+xml" }
            else { $response.ContentType = "application/octet-stream" }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path in $baseDir")
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.OutputStream.Close()
    } catch {
        # ignore context aborts
    }
}
