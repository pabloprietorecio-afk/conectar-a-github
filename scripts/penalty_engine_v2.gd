class_name PenaltyEngineV2
extends RefCounted
const GW:=7.32; const GH:=2.44; const HW:=GW/2.0; const BALL_R:=0.11; const POST_R:=0.06; const DIST:=11.0
static func sig(z:float)->float:return 1.0/(1.0+exp(-z))
static func norm(x:float)->float:return clampf((x-40.0)/59.0,0,1)
static func height_of(y:float)->float:return clampf((y-.1)/2.1,0,1)
static func side_of(x:float)->int:return 0 if absf(x)<.9 else 1 if x>0 else -1
static func flight_time(x:float,y:float,v:float,spin:float)->float:
 var d:=sqrt(DIST*DIST+x*x+pow(y-BALL_R,2))*(1+.03*absf(spin)); return d/v*1.05
static func frame_of(x:float,y:float)->String:
 if absf(x)>HW+POST_R or y>GH+POST_R or y<0:return "fuera"
 var near_post:=absf(absf(x)-HW)<=POST_R and y<=GH
 var near_bar:=absf(y-GH)<=POST_R and absf(x)<=HW
 if near_post or near_bar:return "palo"
 return "gol"
static func pressure(options:Dictionary)->float:
 var importance:float={"amistoso":0.0,"liga":0.0,"copa":.10,"eliminatoria":.20,"estrella":.35,"final":.35}.get(options.get("kind","liga"),0.0)
 var decisive:=.25 if options.get("score_wins",false) or options.get("miss_loses",false) else 0.0
 return clampf(importance+decisive+float(options.get("crowd",0))*.15,0,1)
static func resolve(aim:Vector2,power:float,shooter:Dictionary,keeper:Dictionary,rng:RandomNumberGenerator,options:Dictionary={})->Dictionary:
 var technique:=norm(float(shooter.get("tec",70))); var finishing:=norm(float(shooter.get("def",70))); var composure:=norm(float(shooter.get("sf",70)))
 var pwr:=norm(float(shooter.get("pot",70))); var press:=pressure(options)
 var sigma:=.38-.16*technique-.08*finishing+.15*press*(1.0-composure)
 var x:=aim.x+rng.randfn(0,sigma); var y:=aim.y+rng.randfn(0,sigma*.55); var speed:=20.0+10.0*clampf(power*.65+pwr*.35,0,1)
 var frame:=frame_of(x,y); if frame=="fuera":return {"goal":false,"kind":"fuera","x":x,"y":y}
 var reflex:=norm(float(keeper.get("refl",70))); var agility:=norm(float(keeper.get("agil",70))); var reach:=norm(float(keeper.get("est",70)))
 var save:=clampf(.12+.17*reflex+.12*agility+.08*reach-.08*power+.05*(1.0-height_of(y)),.04,.62)
 var saved:=rng.randf()<save
 return {"goal":not saved,"kind":"parada" if saved else frame,"x":x,"y":y,"speed":speed,"time":flight_time(x,y,speed,0)}
