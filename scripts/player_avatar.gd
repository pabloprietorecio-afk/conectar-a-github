class_name PlayerAvatar
extends Node3D

@export var team_primary := Color("ffffff")
@export var team_secondary := Color("20242b")
@export var wetness := 0.0
@export var mud := 0.0
@onready var director: AnimationDirector = $AnimationDirector

func set_motion(speed_mps: float) -> void:
    if speed_mps < 0.3:
        director.play_semantic(&"idle")
    elif speed_mps < 5.0:
        director.play_semantic(&"jog", clampf(speed_mps / 3.5, 0.7, 1.35))
    else:
        director.play_semantic(&"sprint", clampf(speed_mps / 7.0, 0.8, 1.25))

func celebrate() -> void:
    director.play_semantic(&"celebrate")
