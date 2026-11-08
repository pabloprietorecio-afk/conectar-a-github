class_name MatchSimulator
extends RefCounted
static func simulate(seed_value:int,minutes:int=90)->Dictionary:
 var rng:=RandomNumberGenerator.new();rng.seed=seed_value
 var engine:=MatchEngineV2.new();var state=engine.start(seed_value,minutes);var hands:=0
 while not state.ended and hands<100:
  var side:int=state.possession;var plan:=BotController.choose(state,side,rng)
  state=engine.play(side,plan.action,plan.card,plan.special);hands+=1
 return {"score":state.score,"minute":state.minute,"hands":hands,"energy":state.energy,"ended":state.ended}
static func batch(seed_value:int,count:int,minutes:int=90)->Dictionary:
 var gf:=0;var ga:=0;var draws:=0;var total_hands:=0
 for i in count:
  var r:=simulate(seed_value+i,minutes);gf+=r.score[0];ga+=r.score[1];total_hands+=r.hands;if r.score[0]==r.score[1]:draws+=1
 return {"matches":count,"goals_per_match":float(gf+ga)/count,"home_goals":float(gf)/count,"away_goals":float(ga)/count,"draw_rate":float(draws)/count,"hands_avg":float(total_hands)/count}
