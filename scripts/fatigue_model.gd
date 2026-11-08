class_name FatigueModel
extends RefCounted
const HALF_REST:=18.0
static func action_cost(action:StringName,minutes:int,match_minutes:int,speed:float=1.0)->float:
 var base:float={&"pase":1.0,&"centro":1.3,&"carrera":3.2,&"regate":2.8,&"tiro":2.2,&"proteger":1.8,&"desmarque":2.9,&"despejar":1.5,&"entrada":2.4,&"persigue":3.0,&"posicion":1.1,&"corte":1.8,&"falta":1.4}.get(action,1.5)
 return base*float(minutes)/2.0*90.0/float(maxi(1,match_minutes))*clampf(speed,.75,1.35)
static func effective_modifier(energy:float)->int:return -2 if energy<15 else -1 if energy<35 else 0
static func recover_half(energy:float)->float:return minf(100,energy+HALF_REST)
