Add-Type -AssemblyName System.Drawing

$logoPath = "c:\Users\franh\OneDrive\Documentos\GuIA\Proyectos\TSMAI\app\images\logo.png"
$isotipoPath = "c:\Users\franh\OneDrive\Documentos\GuIA\Proyectos\TSMAI\app\images\TSM Isotipo.png"
$iconsDir = "c:\Users\franh\OneDrive\Documentos\GuIA\Proyectos\TSMAI\app\icons"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir
}

# Determine source image
$srcPath = $logoPath
if (-not (Test-Path $srcPath)) {
    $srcPath = $isotipoPath
}

Write-Host "Using source image: $srcPath"
$sourceImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source image dimensions: $($sourceImg.Width)x$($sourceImg.Height)"

# Function to create formatted icon with solid/gradient background and centered scaled logo
function Create-AppIcon {
    param (
        [System.Drawing.Image]$source,
        [int]$size,
        [string]$outputPath,
        [float]$paddingPercent = 0.12 # 12% padding around logo for maskable/clean icon look
    )

    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background color matching theme-color (#0f172a / dark slate)
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0f172a")
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()

    # Calculate logo scaled dimensions preserving aspect ratio
    $padding = [int]($size * $paddingPercent)
    $maxW = $size - (2 * $padding)
    $maxH = $size - (2 * $padding)

    $ratioW = $maxW / $source.Width
    $ratioH = $maxH / $source.Height
    $ratio = [Math]::Min($ratioW, $ratioH)

    $newW = [int]($source.Width * $ratio)
    $newH = [int]($source.Height * $ratio)

    $posX = [int](($size - $newW) / 2)
    $posY = [int](($size - $newH) / 2)

    # Draw logo
    $g.DrawImage($source, $posX, $posY, $newW, $newH)

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bitmap.Dispose()
    Write-Host "Generated icon: $outputPath ($size x $size)"
}

$rootDir = "c:\Users\franh\OneDrive\Documentos\GuIA\Proyectos\TSMAI\app"

# Generate 192x192, 512x512, 180x180 (Apple touch icon), 64x64, 32x32
Create-AppIcon -source $sourceImg -size 512 -outputPath "$iconsDir\icon-512.png" -paddingPercent 0.10
Create-AppIcon -source $sourceImg -size 192 -outputPath "$iconsDir\icon-192.png" -paddingPercent 0.10
Create-AppIcon -source $sourceImg -size 180 -outputPath "$iconsDir\apple-touch-icon.png" -paddingPercent 0.10
Create-AppIcon -source $sourceImg -size 64  -outputPath "$iconsDir\favicon-64.png" -paddingPercent 0.05
Create-AppIcon -source $sourceImg -size 32  -outputPath "$iconsDir\favicon-32.png" -paddingPercent 0.05

# Root level fallbacks for browsers and Android launcher
Create-AppIcon -source $sourceImg -size 192 -outputPath "$rootDir\apple-touch-icon.png" -paddingPercent 0.10
Create-AppIcon -source $sourceImg -size 64  -outputPath "$rootDir\favicon.png" -paddingPercent 0.05
Create-AppIcon -source $sourceImg -size 32  -outputPath "$rootDir\favicon.ico" -paddingPercent 0.05

$sourceImg.Dispose()
Write-Host "All icons generated successfully!"
