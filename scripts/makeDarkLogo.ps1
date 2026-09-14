# Genera public/logo-dark.png: el logo para fondo oscuro (tienda).
# Letras en blanco (con su borde suavizado), fondo transparente y la manzana
# plateada con sus colores originales.
#
#   powershell -ExecutionPolicy Bypass -File scripts\makeDarkLogo.ps1
param(
  [string]$Source = "$PSScriptRoot\..\public\logo.png",
  [string]$Target = "$PSScriptRoot\..\public\logo-dark.png"
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Source))
$w = $src.Width
$h = $src.Height
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$bmp = $src.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$src.Dispose()

$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$len = $stride * $h
$px = New-Object byte[] $len
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $px, 0, $len)

# Zona de la manzana (medida sobre el logo de 699x416, escalada al tamaño real).
$ax0 = [int]($w * 546 / 699); $ax1 = [int]($w * 656 / 699)
$ay0 = [int]($h * 136 / 416); $ay1 = [int]($h * 266 / 416)
$bw = $ax1 - $ax0 + 1
$bh = $ay1 - $ay0 + 1

function Lum([int]$x, [int]$y) {
  $i = $y * $stride + $x * 4
  return ($px[$i] + $px[$i + 1] + $px[$i + 2]) / 3
}

# Fondo de la zona de la manzana: blanco conectado con el borde de la zona
# (así los brillos internos de la manzana no quedan transparentes).
$bg = New-Object bool[] ($bw * $bh)
$queue = New-Object System.Collections.Generic.Queue[int]
for ($x = $ax0; $x -le $ax1; $x++) {
  foreach ($y in @($ay0, $ay1)) {
    if ((Lum $x $y) -ge 235) { $k = ($y - $ay0) * $bw + ($x - $ax0); if (-not $bg[$k]) { $bg[$k] = $true; $queue.Enqueue($k) } }
  }
}
for ($y = $ay0; $y -le $ay1; $y++) {
  foreach ($x in @($ax0, $ax1)) {
    if ((Lum $x $y) -ge 235) { $k = ($y - $ay0) * $bw + ($x - $ax0); if (-not $bg[$k]) { $bg[$k] = $true; $queue.Enqueue($k) } }
  }
}
while ($queue.Count -gt 0) {
  $k = $queue.Dequeue()
  $cx = $k % $bw; $cy = [math]::Floor($k / $bw)
  foreach ($d in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
    $nx = $cx + $d[0]; $ny = $cy + $d[1]
    if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $bw -or $ny -ge $bh) { continue }
    $nk = $ny * $bw + $nx
    if ($bg[$nk]) { continue }
    if ((Lum ($nx + $ax0) ($ny + $ay0)) -ge 235) { $bg[$nk] = $true; $queue.Enqueue($nk) }
  }
}

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $i = $y * $stride + $x * 4
    $lum = ($px[$i] + $px[$i + 1] + $px[$i + 2]) / 3
    $a = $px[$i + 3]
    $inApple = $x -ge $ax0 -and $x -le $ax1 -and $y -ge $ay0 -and $y -le $ay1 -and $lum -ge 70

    if ($inApple) {
      # Manzana: color original; el fondo blanco se vuelve transparente con borde suave.
      if ($bg[($y - $ay0) * $bw + ($x - $ax0)]) {
        $alpha = if ($lum -ge 250) { 0 } else { [int]((250 - $lum) / 15 * 255) }
        $px[$i + 3] = [byte][math]::Min(255, [int]($alpha * $a / 255))
      }
    } else {
      # Letras: negro → blanco opaco; blanco → transparente.
      $px[$i] = 255; $px[$i + 1] = 255; $px[$i + 2] = 255
      $px[$i + 3] = [byte][int]((255 - $lum) * $a / 255)
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($px, 0, $data.Scan0, $len)
$bmp.UnlockBits($data)
$bmp.Save([System.IO.Path]::GetFullPath($Target), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Listo: $([System.IO.Path]::GetFullPath($Target)) ($w x $h)"
