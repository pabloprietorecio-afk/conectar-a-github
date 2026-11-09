class_name MatchEngineV2
extends RefCounted
signal event(data:Dictionary)
signal finished(state:Dictionary)
var rng:=RandomNumberGenerator.new(); var deck_service:=CardDeck.new(); var state:Dictionary={}
func start(seed_value:int,minutes:int=90)->Dictionary:
 rng.seed=seed_value; var deck=deck_service.build(rng)
 state={"seed":seed_value,"minute":0,"minutes":minutes,"score":[0,0],"possession":rng.randi_range(0,1),"ball":Vector2(32,50),
 "energy":[100.0,100.0],"chain":[0,0],"stars":[CoreRules.CFG.stars,CoreRules.CFG.stars],"deck":deck,"discard":[],"hands":[[],[]],"yellow":[0,0],"red":[0,0],"injuries":[0,0],"half":false,"ended":false}
 for side in 2: _draw_to(side,CoreRules.CFG.hand_size)
 return snapshot()
func play(side:int,action:StringName,card_index:int=-1,special_index:int=-1)->Dictionary:
 if state.ended or side!=state.possession: return snapshot()
 var opponent:=1-side; var atk:=CoreRules.roll_2d6(rng); var defense:=CoreRules.roll_2d6(rng)
 var special_result:Dictionary={}
 if special_index>=0 and special_index<state.hands[side].size():
  var sc:Dictionary=state.hands[side][special_index]
  if sc.get("kind")=="special":
   special_result=SpecialResolver.apply(sc.special,side,state,rng); state.hands[side].remove_at(special_index)
   atk+=int(special_result.get("attack_bonus",0)); defense-=int(special_result.get("defense_bonus",0)); state.energy[opponent]=maxf(0,state.energy[opponent]-float(special_result.get("fatigue",0)))
 var card:Dictionary={}; if card_index>=0 and card_index<state.hands[side].size(): card=_take_card(side,card_index); atk+=int(card.get("power",0))
 var chain_bonus:=mini(CoreRules.CFG.chain_max,int(state.chain[side]/CoreRules.CFG.chain_step)); atk+=chain_bonus
 var success:=atk>=defense;
 if special_result.get("force_win",false): success=true
 if special_result.get("force_loss",false): success=false
 var delta:=0.0
 match action:
  &"pase": delta=rng.randf_range(8,18)
  &"centro": delta=rng.randf_range(12,25)
  &"carrera",&"regate",&"desmarque": delta=rng.randf_range(7,16)
  &"despejar": delta=-rng.randf_range(20,35)
  &"tiro": delta=0
  _: delta=rng.randf_range(4,10)
 if success:
  state.chain[side]+=1; state.chain[opponent]=0
  if action==&"tiro" or (side==0 and state.ball.y<16) or (side==1 and state.ball.y>84): _shot(side,atk)
  else: state.ball.y=clampf(state.ball.y+CoreRules.direction_y(side)*delta,1,99)
 else:
  state.chain[side]=0; state.possession=opponent
 var elapsed:int=CoreRules.CFG.shot_min if action==&"tiro" else CoreRules.CFG.hand_min
 state.energy[side]=maxf(0,state.energy[side]-FatigueModel.action_cost(action,elapsed,state.minutes)); state.minute+=elapsed
 if not state.half and state.minute>=state.minutes/2:
  state.half=true; state.energy[0]=FatigueModel.recover_half(state.energy[0]); state.energy[1]=FatigueModel.recover_half(state.energy[1])
 _draw_to(side,CoreRules.CFG.hand_size)
 if action==&"falta":
  var foul_event:=RulesEvents.foul(.55,rng); state.yellow[side]+=1 if foul_event.yellow else 0; state.red[side]+=1 if foul_event.red else 0
 event.emit({"type":"hand","side":side,"action":action,"success":success,"attack":atk,"defense":defense,"minute":state.minute,"score":state.score.duplicate()})
 if state.minute>=state.minutes: state.minute=state.minutes; state.ended=true; finished.emit(snapshot())
 return snapshot()
func _shot(side:int,power:int)->void:
 var ball_pos: Vector2 = state.ball
 var dist: float = ball_pos.distance_to(CoreRules.goal_point(side)); var pen: float = maxf(0,dist-float(CoreRules.CFG.shot_free))/float(CoreRules.CFG.shot_pen_div)
 var chance: float = clampf(.52+power*.025-pen*.06,.03,.88)
 if rng.randf()<chance: state.score[side]+=1; state.ball=Vector2(32,50); state.possession=1-side
 else: state.possession=1-side
func _energy_cost(action:StringName)->float:
 return 3.2 if action in [&"carrera",&"regate",&"desmarque"] else 2.4 if action in [&"tiro",&"entrada"] else 1.4
func _draw_to(side:int,n:int)->void:
 while state.hands[side].size()<n and not state.deck.is_empty(): state.hands[side].append(state.deck.pop_back())
func _take_card(side:int,index:int)->Dictionary:
 var c:Dictionary=state.hands[side].pop_at(index); state.discard.append(c); return c
func snapshot()->Dictionary: return state.duplicate(true)
