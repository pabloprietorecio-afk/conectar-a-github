extends SceneTree
var failed:=0
func check(n:String,c:bool):
 if c: print("OK   ",n)
 else: failed+=1; push_error("FAIL "+n)
func _initialize():
 var r:=RandomNumberGenerator.new(); r.seed=7
 var schedule=LeagueEngine.make_schedule(["a","b","c","d"],2,r)
 check("liga ida/vuelta",schedule.size()==6)
 var eng:=MatchEngineV2.new(); var s=eng.start(42,6)
 check("mano inicial cinco",s.hands[0].size()==5 and s.hands[1].size()==5)
 check("minuto inicial",s.minute==0)
 var p=PenaltyEngineV2.frame_of(0,1); check("penal centro gol",p=="gol")
 check("penal fuera",PenaltyEngineV2.frame_of(9,1)=="fuera")
 check("categoría ascenso",LeagueEngine.season_outcome(4,5).division_change==-1)
 print("RESULT failures=",failed); quit(1 if failed else 0)
