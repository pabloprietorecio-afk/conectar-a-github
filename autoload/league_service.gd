extends Node

const CLUBS := ["Madrid Blanco", "Barcelona Azulgrana", "Atlético Rojo", "Sevilla", "Valencia", "Real Norte", "Bilbao", "Vigo", "Villarreal", "Betis"]
var season: Dictionary = {}

func new_season(club: String = CLUBS[0]) -> Dictionary:
    var teams: Array = []
    for name in CLUBS:
        teams.append({"name": name, "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0})
    season = {"club": club, "round": 1, "teams": teams, "history": []}
    return season

func record_user_result(gf: int, ga: int) -> void:
    if season.is_empty(): new_season()
    var rng := RandomNumberGenerator.new()
    rng.seed = int(Time.get_unix_time_from_system()) + int(season.round)
    for i in season.teams.size():
        var t: Dictionary = season.teams[i]
        var a := gf if t.name == season.club else rng.randi_range(0, 3)
        var b := ga if t.name == season.club else rng.randi_range(0, 3)
        t.p += 1; t.gf += a; t.ga += b
        if a > b: t.w += 1; t.pts += 3
        elif a == b: t.d += 1; t.pts += 1
        else: t.l += 1
    season.history.append({"round": season.round, "gf": gf, "ga": ga})
    season.round += 1
    season.teams.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
        if a.pts != b.pts: return a.pts > b.pts
        var ad: int = a.gf - a.ga
        var bd: int = b.gf - b.ga
        return ad > bd if ad != bd else a.gf > b.gf)

func table_text() -> String:
    if season.is_empty(): new_season()
    var lines := PackedStringArray(["  EQUIPO                 PJ   DG  PTS"])
    for i in season.teams.size():
        var t: Dictionary = season.teams[i]
        lines.append("%2d %-21s %2d %+4d %3d" % [i + 1, t.name, t.p, t.gf - t.ga, t.pts])
    return "\n".join(lines)
