# Football Cards Godot - estado de entrega

## Implementado en código
- Proyecto Godot vertical.
- Partido jugable por cartas con reloj, marcador, posesión, zona, energía, rareza y resolución rival.
- Liga simplificada y clasificación persistente durante la sesión.
- Base de penaltis/tanda y gesto representado como vector de puntería y potencia.
- Plantilla, sobres y mejor once.
- Progresión, pase de 40 niveles y logros base.
- Guardado JSON.
- Avatar GLB original integrado como placeholder.
- Abstracción semántica de animaciones.
- Clima: estados, lluvia, niebla e iluminación.
- Audio 3D por eventos.
- Shader de césped con respuesta a humedad.
- Documentación del pipeline definitivo de assets.

## Diferencia entre código completo y producción audiovisual
El juego puede contener la arquitectura y comportamiento para hiperrealismo, pero las mallas, texturas PBR, captura/producción de animaciones y grabaciones nuevas son contenido artístico externo. No se han inventado ni copiado assets de terceros sin una licencia comprobada. El proyecto deja esos puntos desacoplados mediante AnimationDirector, materiales y AudioDirector.

## Validación
`tests_smoke.py` comprueba estructura, recursos críticos y balanceo superficial de archivos GDScript. Para certificación final de runtime se debe importar con Godot 4.7.x y ejecutar el proyecto/editor; el entorno de construcción utilizado para esta entrega no incluye el ejecutable Godot.
