class_name MatchCoordinator
extends Node
signal completed(result:Dictionary)
var engine:=MatchEngineV2.new();var state:Dictionary={};var mode:=&"friendly"
func begin(seed_value:int,kind:StringName=&"friendly",minutes:int=90)->Dictionary:mode=kind;state=engine.start(seed_value,minutes);return state
func player_action(action:StringName,card:int=-1,special:int=-1)->Dictionary:
 if state.ended:return state
 state=engine.play(int(state.possession),action,card,special)
 if not state.ended and state.possession==1:
  var r:=RandomNumberGenerator.new();r.seed=int(state.seed)+int(state.minute)*31;var plan:=BotController.choose(state,1,r);state=engine.play(1,plan.action,plan.card,plan.special)
 if state.ended:_finish()
 return state
func _finish()->void:
 var reward:=CareerService.apply_match_result(int(state.score[0]),int(state.score[1]));if mode==&"league":LeagueService.record_user_result(int(state.score[0]),int(state.score[1]));completed.emit({"score":state.score,"reward":reward,"mode":mode})
