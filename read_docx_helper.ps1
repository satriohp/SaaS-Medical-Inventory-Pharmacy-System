param($path)
$ErrorActionPreference = "Stop"
try {
    $tempZip = "$path.temp.zip"
    $tempDir = "$path.temp_dir"

    # Create temp zip copy
    Copy-Item -Path $path -Destination $tempZip -Force
    
    # Extract
    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
    Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force
    
    # Read XML
    $xmlPath = "$tempDir\word\document.xml"
    if (Test-Path $xmlPath) {
        $content = Get-Content $xmlPath -Raw
        # Simple extraction of text
        # Word stores text in <w:t> tags. Just stripping all tags works for rough content.
        # However, to avoid mashing words together, let's replace <w:p> and <w:br> with newlines roughly?
        # Actually stripping <[^>]+> replaces with space in my previous thought, that's safer.
        
        $text = [System.Text.RegularExpressions.Regex]::Replace($content, "<[^>]+>", " ")
        $text = [System.Text.RegularExpressions.Regex]::Replace($text, "\s+", " ")
        $text = $text.Trim()
        
        Write-Output $text
    } else {
        Write-Output "Error: document.xml not found inside document structure."
    }
    
    # Cleanup
    Remove-Item -Path $tempZip -Force
    Remove-Item -Path $tempDir -Recurse -Force
} catch {
    Write-Output "Error reading docx: $_"
    # Attempt cleanup if failed
    if (Test-Path $tempZip) { Remove-Item -Path $tempZip -Force }
    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
}
