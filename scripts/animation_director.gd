class_name AnimationDirector
extends Node

## Semantic animation layer. Imported clip names are mapped here so assets can be
## replaced without rewriting match logic.
@export var animation_player: AnimationPlayer
@export var blend_time := 0.18

var aliases: Dictionary = {
    &"idle": [&"Idle_Loop"],
    &"jog": [&"Jog_Fwd_Loop"],
    &"sprint": [&"Sprint_Loop"],
    &"celebrate": [&"Dance_Loop"],
    &"duel": [&"Punch_Jab"]
}

func _ready() -> void:
    if not animation_player:
        animation_player = get_parent().find_child("AnimationPlayer", true, false) as AnimationPlayer

func play_semantic(action: StringName, speed: float = 1.0) -> bool:
    if not animation_player:
        return false
    var candidates: Array = aliases.get(action, [])
    for clip in candidates:
        if animation_player.has_animation(clip):
            animation_player.speed_scale = speed
            animation_player.play(clip, blend_time)
            return true
    return false

func register_alias(action: StringName, clips: Array[StringName]) -> void:
    aliases[action] = clips
