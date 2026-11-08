class_name WeatherController
extends Node3D

enum Weather { CLEAR, OVERCAST, RAIN, STORM, FOG }
@export var sun: DirectionalLight3D
@export var world_environment: WorldEnvironment
@export var precipitation: GPUParticles3D
var current := Weather.CLEAR
var intensity := 0.0

func _ready() -> void:
    if not sun: sun = get_parent().get_node_or_null("Sun") as DirectionalLight3D
    if not world_environment: world_environment = get_parent().get_node_or_null("WorldEnvironment") as WorldEnvironment
    if not precipitation: precipitation = get_node_or_null("Rain") as GPUParticles3D

func set_weather(kind: Weather, value: float = 1.0) -> void:
    current = kind
    intensity = clampf(value, 0.0, 1.0)
    if precipitation:
        precipitation.emitting = kind in [Weather.RAIN, Weather.STORM] and intensity > 0.01
        precipitation.amount_ratio = maxf(0.05, intensity)
    if sun:
        sun.light_energy = lerpf(1.15, 0.45, intensity) if kind != Weather.CLEAR else 1.15
    if world_environment and world_environment.environment:
        var env := world_environment.environment
        env.fog_enabled = kind == Weather.FOG or kind in [Weather.RAIN, Weather.STORM]
        env.fog_density = (0.012 if kind == Weather.FOG else 0.003) * intensity
    GameState.weather_changed.emit(Weather.keys()[kind].to_lower(), intensity)
