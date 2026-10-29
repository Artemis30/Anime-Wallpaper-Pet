# Virtual Pet v0.3.1 (Windows)

## Importante:

El proyecto continúa en fase beta y todavía sigue en desarrollo (lo desarrollo en mi tiempo libre, no soy programador ni nada de eso, lo siento). Existen algunos errores e incompatibilidades con ciertas aplicaciones, pero en próximas actualizaciones se incluirá un menú para cambiar los assets del personaje con facilidad (próximos assets en un par de días: Marin Kitagawa y Hatsune Miku).

¡Gracias por probar esta beta!

## Instalación fácil
1. Instala Node.js LTS desde https://nodejs.org (solo la primera vez).
2. Haz doble clic en **INSTALAR.bat**. Descarga lo necesario y crea en `dist/`:
   - `Capri-Setup.exe`: instalador normal (recomendado; permite "Iniciar con Windows").
   - `Capri-portable.exe`: sin instalar, se ejecuta directamente.
   También deja un acceso directo en el escritorio.
3. Para abrirla otra vez: acceso directo del escritorio, o **EJECUTAR.bat**.
Una vez creado el .exe, puedes copiarlo a otro PC con Windows sin instalar nada más.

## Modo desarrollo
    npm install
    npm start

## Cerrar
- Clic derecho sobre Capri → Salir
- Icono de la bandeja del sistema (junto al reloj, quizá dentro de "^") → Salir. Ahí también: "Iniciar con Windows" (solo en la versión .exe)
- Ctrl+C en la terminal, o `taskkill /IM electron.exe /F`

## Qué hace
- Clic: menú (Música, Apps, Archivos, Utilidades, Dormir). Arrastrar: moverla. Clic derecho: dormir / salir.
- **Auriculares automáticos:** vigila el audio que sale por tu dispositivo de reproducción (cualquier app o pestaña
  del navegador). Si suena algo ~1 s, se pone los auriculares; tras ~5 s de silencio, se los quita. Con auriculares
  puestos a veces se sienta a escuchar. Funciona leyendo el medidor de audio de Windows con un PowerShell en segundo plano.
  No distingue qué app o pestaña concreta suena (eso requeriría una extensión del navegador).
- **Spotify:** abrir la app, ⏮ ⏯ ⏭ (teclas multimedia del sistema, controlan el reproductor activo) y "¿Qué suena?"
  (lee el título de la ventana de Spotify; no funciona si está minimizado en la bandeja).
- **Lanzador de apps:** clic derecho en el icono de la bandeja → "Editar lista de apps" (o `apps.json` en modo desarrollo) (`name` y `open`: una app, ruta, URL o protocolo como `spotify:`).
- **Dormir:** bostezo → almohada → dormida. Clic para despertarla.
- **Avisos externos:** `Invoke-RestMethod -Method Post -Uri http://127.0.0.1:47823/event -Body '{"message":"Hola"}' -ContentType 'application/json'`

## Sprites
`tools/make_sprites.py` recorta `tools/spritesheet.png`, quita el fondo y genera `assets/` (tiras PNG + `character.json`).
No hay ciclo de caminar en la hoja: al andar se usa el fotograma de pie con un rebote. Si añades fotogramas de caminar,
amplía `S` en el script (necesita Pillow, numpy y scipy).

## Apagar el PC
Menú → Utilidades → "Apagar el PC" (o bandeja → "Apagar el PC"). Pide confirmación, pone todas las pantallas en negro
con el logo (`assets/logo.png`) durante 6 s y ejecuta `shutdown /s /t 0`. Se cancela con **Esc** o con un clic.
Para probarlo sin apagar: `npx electron . --dry-run` (o `Capri-portable.exe --dry-run`).
Para cambiar la duración, edita el `6` en `startShutdown(6)` de `main.js`.
