# Genera los íconos de la app (favicon / Android / iOS) a partir del logo.
# Recorta un cuadrado alrededor del isotipo (la columna "I  S") y lo escala.
#
#   powershell -ExecutionPolicy Bypass -File scripts/makeIcons.ps1
#   powershell ... -File scripts/makeIcons.ps1 -CenterX 0.785 -CenterY 0.47 -Side 0.46
#
param(
  # Original (con márgenes). Genera public/logo.png recortado + íconos.
  [string]$Source = "src/assets/logo-original.jpeg",
  [string]$OutDir = "public/icons",
  # Centro y lado del recorte, en proporción del ancho/alto de la imagen.
  [double]$CenterX = 0.79,
  [double]$CenterY = 0.465,
  [double]$Side = 0.385,
  # Todo lo que queda a la izquierda de esta proporción del ancho se pinta de
  # blanco (elimina el resto de "FACE" que entra en el cuadrado).
  [double]$MaskLeft = 0.712
)

Add-Type -AssemblyName System.Drawing
$src = Resolve-Path $Source
$img = [System.Drawing.Image]::FromFile($src)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$sidePx = [int]([math]::Min($img.Width, $img.Height) * $Side)
$x = [int]($CenterX * $img.Width - $sidePx / 2)
$y = [int]($CenterY * $img.Height - $sidePx / 2)
$x = [math]::Max(0, [math]::Min($x, $img.Width - $sidePx))
$y = [math]::Max(0, [math]::Min($y, $img.Height - $sidePx))
$crop = New-Object System.Drawing.Rectangle $x, $y, $sidePx, $sidePx
Write-Output ("Fuente: {0}x{1} · recorte: x={2} y={3} lado={4}" -f $img.Width, $img.Height, $x, $y, $sidePx)

function Save-Square([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $dest = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $g.DrawImage($img, $dest, $crop, [System.Drawing.GraphicsUnit]::Pixel)
  # Máscara blanca a la izquierda del isotipo.
  $maskPx = [int](($MaskLeft * $img.Width - $crop.X) * $size / $crop.Width)
  if ($maskPx -gt 0) {
    $g.FillRectangle([System.Drawing.Brushes]::White, 0, 0, [math]::Min($maskPx, $size), $size)
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "  -> $path"
}

# Logotipo completo recortado al contenido (para nav, hero, footer, login).
$wm = New-Object System.Drawing.Rectangle ([int](0.17 * $img.Width)), ([int](0.275 * $img.Height)), ([int](0.715 * $img.Width)), ([int](0.465 * $img.Height))
$wbmp = New-Object System.Drawing.Bitmap $wm.Width, $wm.Height
$wg = [System.Drawing.Graphics]::FromImage($wbmp)
$wg.Clear([System.Drawing.Color]::White)
$wg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$wg.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $wm.Width, $wm.Height), $wm, [System.Drawing.GraphicsUnit]::Pixel)
$wbmp.Save("public/logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$wg.Dispose(); $wbmp.Dispose()
Write-Output ("  -> public/logo.png ({0}x{1})" -f $wm.Width, $wm.Height)

Save-Square 512 (Join-Path $OutDir "icon-512.png")
Save-Square 192 (Join-Path $OutDir "icon-192.png")
Save-Square 180 (Join-Path $OutDir "apple-touch-icon.png")
Save-Square 32  (Join-Path $OutDir "favicon-32.png")
$img.Dispose()
Write-Output "Listo."
