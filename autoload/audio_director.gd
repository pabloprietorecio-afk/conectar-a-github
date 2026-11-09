extends Node
var catalog:Dictionary={}; var crowd_level:=0.35; var tension:=0.0
func _ready()->void:
 var f:=FileAccess.open("res://audio/manifest.json",FileAccess.READ)
 if f:
  var parsed = JSON.parse_string(f.get_as_text())
  if parsed is Dictionary:
   catalog = parsed
  else:
   catalog = {}
func stream_for(key:String)->AudioStream:
 if not catalog.has(key):return null
 return load("res://audio/"+str(catalog[key].file)) as AudioStream
func play_2d(key:String,volume_db:float=0)->AudioStreamPlayer:
 var p:=AudioStreamPlayer.new();p.stream=stream_for(key);p.volume_db=volume_db;add_child(p)
 if p.stream:p.finished.connect(p.queue_free);p.play()
 else:p.queue_free()
 return p
func play_3d(key:String,position:Vector3)->AudioStreamPlayer3D:
 var p:=AudioStreamPlayer3D.new();p.stream=stream_for(key);p.position=position;p.max_distance=70;add_child(p)
 if p.stream:p.finished.connect(p.queue_free);p.play()
 else:p.queue_free()
 return p
func set_match_tension(value:float)->void:tension=clampf(value,0,1);crowd_level=lerpf(.30,.85,tension)
