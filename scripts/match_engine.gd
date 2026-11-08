class_name MatchEngine
extends RefCounted

# First pure-logic migration slice from the browser engine.
const FIELD := {"w": 64.0, "l": 100.0, "gx": 32.0, "goal_half": 6.0}
const ATTACK := [&"pase", &"centro", &"carrera", &"regate", &"tiro", &"proteger", &"desmarque", &"despejar"]
const DEFENSE := [&"entrada", &"persigue", &"posicion", &"corte", &"falta"]
const SKILL := {
    &"pase": &"PAS", &"centro": &"PAS", &"carrera": &"VEL", &"regate": &"REG",
    &"proteger": &"FIS", &"tiro": &"TIR", &"entrada": &"DEF", &"posicion": &"DEF",
    &"corte": &"DEF", &"despejar": &"FIS", &"persigue": &"VEL"
}

static func clamp_point(p: Vector2) -> Vector2:
    return Vector2(clampf(p.x, 1.5, 62.5), clampf(p.y, 1.0, 99.0))

static func direction_y(side: int) -> float:
    return -1.0 if side == 0 else 1.0

static func goal_point(side: int) -> Vector2:
    return Vector2(FIELD.gx, 0.0 if side == 0 else FIELD.l)

static func move_toward_point(origin: Vector2, target: Vector2, max_distance: float) -> Vector2:
    var d := origin.distance_to(target)
    if d <= max_distance or is_zero_approx(d):
        return target
    return origin.lerp(target, max_distance / d)

static func quality_of(value: float) -> int:
    if value >= 90.0: return 2
    if value >= 80.0: return 1
    if value >= 66.0: return 0
    return -1

static func positional_penalty(player_pos: StringName, target_pos: StringName) -> float:
    if player_pos == target_pos:
        return 1.0
    var families := {
        &"POR": [&"POR"],
        &"DEF": [&"LI", &"LD", &"DFC"],
        &"MED": [&"MCD", &"MC", &"MCO", &"MI", &"MD"],
        &"DEL": [&"EI", &"ED", &"DC"]
    }
    for family in families.values():
        if player_pos in family and target_pos in family:
            return 0.75
    return 0.45
