extends Node
const SAVE_PATH := "user://career_v1.json"
var data := {"version":1,"club":"","division":5,"stars":0,"season":{},"squad":[],"injuries":{},"formation":"4-3-3","coins":2500,"tokens":0,"history":[]}
func new_career(club:String,squad:Array)->void:data={"version":1,"club":club,"division":5,"stars":0,"season":{},"squad":squad.duplicate(true),"injuries":{},"formation":"4-3-3","coins":2500,"tokens":0,"history":[]};save()
func apply_match_result(gf:int,ga:int)->Dictionary:
 for id in data.injuries.keys():data.injuries[id]=maxi(0,int(data.injuries[id])-1)
 var rewards:=RewardService.register_result(gf>ga,gf,int(Time.get_unix_time_from_system()));data.coins+=120+(80 if gf>ga else 35 if gf==ga else 10);save();return rewards
func register_injury(id:String,games:int)->void:data.injuries[id]=maxi(int(data.injuries.get(id,0)),games);save()
func available(p:Dictionary)->bool:return int(data.injuries.get(str(p.get("id","")),0))<=0
func set_formation(v:String)->void:
 if v in FormationService.FORMATIONS:data.formation=v;save()
func save()->void:
 var f:=FileAccess.open(SAVE_PATH,FileAccess.WRITE)
 if f:f.store_string(JSON.stringify(data,"  "))
func load_data()->bool:
 if not FileAccess.file_exists(SAVE_PATH):return false
 var f:=FileAccess.open(SAVE_PATH,FileAccess.READ);var x=JSON.parse_string(f.get_as_text()) if f else null
 if x is Dictionary:data=x;return true
 return false
