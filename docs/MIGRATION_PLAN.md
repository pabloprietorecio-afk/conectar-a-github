# Plan de migración

## Principio
Reescritura nativa, no envoltorio de la web. La simulación debe permanecer determinista y desacoplada de presentación para poder portar y contrastar las pruebas existentes.

## Fases
1. **Vertical slice Godot**: escena 3D, input vertical, guardado, avatar, clima y audio.
2. **Paridad lógica**: portar motor de manos, cartas, dados, posiciones, fatiga, penaltis y Liga con pruebas deterministas.
3. **UI**: menú, Vestuario, Liga, partido, cartas, VAR, descanso y tanda.
4. **Character pipeline**: rig humano común, AnimationTree, locomoción 8-way, anticipaciones, contactos, tiros, pases, recepciones, entradas, caídas, porteros y celebraciones.
5. **Lookdev**: materiales PBR de piel/ropa/botas, kits parametrizados, césped multicapa, suciedad, humedad, iluminación de estadio y postprocesado.
6. **Clima**: lluvia, niebla, viento visual, superficies mojadas y respuesta sonora.
7. **Audio**: stems de grada, reactividad al peligro, SFX 3D, superficies y narración.
8. **Cinemáticas**: túnel, alineaciones, broadcast cameras y repetición.
9. **Rendimiento**: LOD, crowd instancing, occlusion, budgets por perfil y Android profiling.

## Regla de animación
El gameplay pide acciones semánticas (`shoot_power`, `pass_short`, `save_dive_left`, etc.). `AnimationDirector` resuelve qué clip/blend usar. Así se pueden sustituir animaciones sin tocar las reglas.

## Riesgos principales
- La fuente anterior concentra mucho comportamiento en HTML/JS: portar por módulos y validar por semillas.
- El avatar actual es provisional: el hiperrealismo exige nuevos assets y animaciones, no sólo código.
- Crowd y cabello/ropa son caros en móvil: deben tener LOD y variantes por perfil.
