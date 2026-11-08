class_name Shootout
extends RefCounted

var rng := RandomNumberGenerator.new()
var goals := [0,0]
var hist := [[],[]]
var kicks := 0
var first := 0
var winner := -1

func start(seed_value:int, first_side:int=0) -> void:
    rng.seed=seed_value; goals=[0,0]; hist=[[],[]]; kicks=0; first=first_side; winner=-1

func kick(aim:Vector2, power:float, keeper:Vector2=Vector2.ZERO) -> Dictionary:
    var side := first if kicks % 2 == 0 else 1-first
    var accuracy := clampf(1.0 - aim.length()*0.08 - absf(power-.72)*.25, .25, .96)
    var on_target := rng.randf() < accuracy
    var save_chance := clampf(.18 + (1.0-aim.distance_to(keeper))*0.18, .08, .48)
    var saved := on_target and rng.randf() < save_chance
    var goal := on_target and not saved
    if goal: goals[side]+=1
    hist[side].append(goal); kicks+=1; _decide()
    return {"side":side,"goal":goal,"saved":saved,"off":not on_target,"score":goals.duplicate(),"winner":winner}

func _decide() -> void:
    if kicks < 10: return
    if kicks % 2 == 0 and goals[0] != goals[1]: winner = 0 if goals[0] > goals[1] else 1
