extends Node
const PATH := "user://settings.json"
var data := {"master":1.0,"crowd":.8,"voice":.9,"sfx":.9,"turbo":false,"reduced_motion":false,"quality":"mobile_high"}
func _ready()->void:load_data();apply()
func set_value(k:String,v)->void:data[k]=v;apply();save()
func apply()->void:
 var i:=AudioServer.get_bus_index("Master")
 if i>=0:AudioServer.set_bus_volume_db(i,linear_to_db(clampf(float(data.master),.001,1)))
func save()->void:
 var f:=FileAccess.open(PATH,FileAccess.WRITE)
 if f:f.store_string(JSON.stringify(data))
func load_data()->void:
 if FileAccess.file_exists(PATH):
  var f:=FileAccess.open(PATH,FileAccess.READ);var x=JSON.parse_string(f.get_as_text()) if f else null
  if x is Dictionary:data.merge(x,true)
