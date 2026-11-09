class_name BotController
extends RefCounted

static func choose(state:Dictionary,side:int,rng:RandomNumberGenerator)->Dictionary:
 var ball:Vector2=state.ball; var attacking:bool=(int(state.possession)==side); var goal_y:float=0.0 if side==0 else 100.0; var distance:float=absf(ball.y-goal_y)
 var choices:Array[StringName]
 if attacking:
  if distance<20: choices=[&"tiro",&"regate",&"pase"]
  elif distance<42: choices=[&"pase",&"regate",&"carrera",&"centro"]
  else: choices=[&"pase",&"carrera",&"desmarque"]
 else:
  choices=[&"posicion",&"persigue",&"corte",&"entrada"]
 var hand:Array=state.hands[side]; var best:=-1; var best_power:=-1
 for i in hand.size():
  var c:Dictionary=hand[i]
  if c.kind=="card" and int(c.power)>best_power: best=i; best_power=int(c.power)
 return {"action":choices[rng.randi_range(0,choices.size()-1)],"card":best,"special":_special_index(hand,state,side)}
static func _special_index(hand:Array,state:Dictionary,side:int)->int:
 for i in hand.size():
  var c:Dictionary=hand[i]
  if c.kind=="special":
   if c.special in ["entrada_perfecta","contraataque","pase_magistral","aficion"]: return i
   if c.special=="pausa" and state.chain[1-side]>=1:return i
 return -1
