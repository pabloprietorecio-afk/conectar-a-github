class_name CoreRules
extends RefCounted

const FIELD := {"W":64.0,"L":100.0,"GX":32.0,"GOAL_HALF":6.0}
const CFG := {"base":4,"dice_n":2,"dice_f":6,"hand_size":5,"minutes":90,"hand_min":2,"shot_min":3,
"cut_base":7.0,"stars":2,"star_bonus":4,"chain_step":2,"chain_max":2,"contact":7.0,"tackle_reach":10.0,
"move_base":8.0,"move_per":3.0,"pass_pen":15.0,"cross_pen":25.0,"shot_free":12.0,"shot_pen_div":4.0,
"off_start":20.0,"off_span":24.0,"off_max":0.9}
const ATTACK := [&"pase",&"centro",&"carrera",&"regate",&"tiro",&"proteger",&"desmarque",&"despejar"]
const DEFENSE := [&"entrada",&"persigue",&"posicion",&"corte",&"falta"]
const SKILL := {&"pase":&"PAS",&"centro":&"PAS",&"carrera":&"VEL",&"regate":&"REG",&"proteger":&"FIS",&"tiro":&"TIR",
&"entrada":&"DEF",&"posicion":&"DEF",&"corte":&"DEF",&"despejar":&"FIS",&"persigue":&"VEL",&"disputa":&"FIS",&"portero":&"POR"}

static func roll_2d6(rng:RandomNumberGenerator)->int: return rng.randi_range(1,6)+rng.randi_range(1,6)
static func quality(value:float)->int: return 2 if value>=90 else 1 if value>=80 else 0 if value>=66 else -1
static func direction_y(side:int)->float: return -1.0 if side==0 else 1.0
static func goal_point(side:int)->Vector2: return Vector2(FIELD.GX,0.0 if side==0 else FIELD.L)
static func clamp_point(p:Vector2)->Vector2: return Vector2(clampf(p.x,1.5,62.5),clampf(p.y,1.0,99.0))
static func move_toward_point(origin:Vector2,target:Vector2,max_dist:float)->Vector2:
 var d:=origin.distance_to(target); return target if d<=max_dist or is_zero_approx(d) else origin.lerp(target,max_dist/d)
