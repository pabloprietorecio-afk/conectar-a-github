class_name Navigation
extends Node
signal changed(screen:StringName,payload:Dictionary)
var current:=&"home";var history:Array[StringName]=[]
func go(s:StringName,p:Dictionary={})->void:history.append(current);current=s;changed.emit(current,p)
func back()->void:
 if not history.is_empty():current=history.pop_back();changed.emit(current,{})
