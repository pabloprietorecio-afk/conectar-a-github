class_name PenaltyEngine
extends RefCounted

const GOAL_W := 7.32
const GOAL_H := 2.44
const HALF_W := GOAL_W / 2.0
const BALL_R := 0.11
const POST_R := 0.06
const DIST := 11.0

static func sigmoid(z: float) -> float:
    return 1.0 / (1.0 + exp(-z))

static func normalize_attribute(value: float) -> float:
    return clampf((value - 40.0) / 59.0, 0.0, 1.0)

static func power_ring(milliseconds: float, period_seconds: float = 1.25) -> float:
    var phase := (milliseconds / 1000.0) / period_seconds
    var fraction := phase - floor(phase)
    return 1.0 - absf(1.0 - 2.0 * fraction)

static func next_kick(kicks: int, first_side: int, team_counts: Array[int], lists: Array) -> Dictionary:
    var side := first_side if kicks % 2 == 0 else 1 - first_side
    var team_list: Array = lists[side]
    var idx := team_counts[side] % team_list.size()
    return {"side": side, "who": team_list[idx], "round": kicks / 2 + 1, "sudden": kicks >= 10}
