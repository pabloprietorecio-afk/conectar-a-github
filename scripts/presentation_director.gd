class_name PresentationDirector
extends Node3D
@export var player_home:PlayerAvatar
@export var player_away:PlayerAvatar
@export var camera:Camera3D
@export var weather:WeatherController
func present(event:Dictionary)->void:
 var side:int=event.get("side",0);var avatar:PlayerAvatar=player_home if side==0 else player_away;var action:StringName=event.get("action",&"idle")
 if action in [&"carrera",&"desmarque"]:avatar.set_motion(6.2)
 elif action==&"tiro":avatar.director.play_semantic(&"duel")
 else:avatar.set_motion(2.8)
 if event.get("goal",false):avatar.celebrate();AudioDirector.play_2d("goal1",-2)
func set_broadcast_camera(close:bool)->void:
 if not camera:return
 camera.fov=34 if close else 48
