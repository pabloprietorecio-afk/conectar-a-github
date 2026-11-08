# Football Cards - Godot Edition

Reescritura nativa del proyecto Football Cards para Godot 4.7.x.

## Ejecutar
Abrir `project.godot` en Godot. La escena inicial es `scenes/main.tscn`.

## Contenido
El repositorio incluye motor de partido por cartas, liga, guardado, plantilla/manager, progresión, tanda base, avatar 3D, animación semántica, clima, audio 3D y shader de césped húmedo. `legacy/` conserva módulos JS seleccionados únicamente como material de comparación durante el port.

## Arte final
`assets/player_base.glb` es el modelo CC0 que ya utilizaba el proyecto original y se mantiene como placeholder. La producción hiperrealista final requiere sustituir ese placeholder por modelos, texturas, kits, estadio, crowd y librería de animaciones con procedencia/licencia verificable. El runtime está desacoplado para permitir ese reemplazo.

Consulta `docs/FINAL_STATUS.md`, `docs/ANIMATION_CATALOG.md` y `docs/ASSET_REQUIREMENTS.md`.
