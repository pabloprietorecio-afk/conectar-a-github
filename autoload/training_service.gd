extends Node
func train(player:Dictionary,focus:String,rng:RandomNumberGenerator)->Dictionary:
 var p:=player.duplicate(true);var gain:=1 if rng.randf()<.72 else 2
 p.ovr=mini(99,int(p.get("ovr",60))+gain);p[focus]=mini(99,int(p.get(focus,60))+gain);return p
