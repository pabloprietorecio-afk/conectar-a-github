class_name RulesEvents
extends RefCounted

static func foul(severity:float,rng:RandomNumberGenerator)->Dictionary:
 var roll:=rng.randf(); var yellow:=roll<clampf(.22+severity*.42,0,0.88); var red:=roll<clampf(.015+maxf(0,severity-.65)*.16,0,.16)
 return {"foul":true,"yellow":yellow and not red,"red":red,"penalty":false}
static func injury(energy:float,contact:float,rng:RandomNumberGenerator)->Dictionary:
 var fatigue:=clampf((45.0-energy)/45.0,0,1); var chance:=.008+.028*fatigue+.02*contact
 var hit:=rng.randf()<chance
 return {"injured":hit,"games":rng.randi_range(1,3) if hit else 0}
static func decide_restart(ball:Vector2,last_touch:int)->Dictionary:
 if ball.y<=0 or ball.y>=100:
  if absf(ball.x-32)<=6:return {"type":"goal_check"}
  return {"type":"corner","side":1-last_touch}
 if ball.x<=0 or ball.x>=64:return {"type":"throw_in","side":1-last_touch}
 return {"type":"play"}
static func var_review(original_goal:bool,incident_strength:float,rng:RandomNumberGenerator)->Dictionary:
 var overturn:=rng.randf()<clampf(.04+incident_strength*.28,.04,.32)
 return {"reviewed":true,"goal":not original_goal if overturn else original_goal,"overturned":overturn}
