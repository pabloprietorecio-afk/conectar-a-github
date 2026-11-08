extends Node

var daily := {"play":0,"win":0,"goals":0}
var achievements: Dictionary = {}
var season_xp := 0
var season_level := 1

func register_match(gf:int, ga:int) -> void:
    daily.play += 1; daily.goals += gf
    if gf > ga: daily.win += 1
    season_xp += 100 + gf * 25 + (75 if gf > ga else 25 if gf == ga else 0)
    season_level = clampi(1 + season_xp / 500, 1, 40)
    _check()

func _check() -> void:
    if daily.play >= 1: achievements["debut"] = true
    if daily.win >= 1: achievements["primera_victoria"] = true
    if daily.goals >= 5: achievements["goleador"] = true
