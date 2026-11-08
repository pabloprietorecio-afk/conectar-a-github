class_name CardMatch
extends RefCounted

signal changed(snapshot: Dictionary)
signal finished(snapshot: Dictionary)

const ACTIONS := [
    {"id": &"pase", "name": "Pase", "skill": &"PAS", "attack": true, "base": 5},
    {"id": &"carrera", "name": "Carrera", "skill": &"VEL", "attack": true, "base": 5},
    {"id": &"regate", "name": "Regate", "skill": &"REG", "attack": true, "base": 6},
    {"id": &"tiro", "name": "Tiro", "skill": &"TIR", "attack": true, "base": 5},
    {"id": &"entrada", "name": "Entrada", "skill": &"DEF", "attack": false, "base": 6},
    {"id": &"posicion", "name": "Posición", "skill": &"DEF", "attack": false, "base": 5},
    {"id": &"corte", "name": "Corte", "skill": &"DEF", "attack": false, "base": 5},
    {"id": &"despejar", "name": "Despejar", "skill": &"FIS", "attack": false, "base": 5}
]

var rng := RandomNumberGenerator.new()
var minute := 0
var score := [0, 0]
var possession := 0
var zone := 50.0
var energy := [100.0, 100.0]
var hand: Array[Dictionary] = []
var log: Array[String] = []
var ended := false

func start(seed_value: int) -> void:
    rng.seed = seed_value
    minute = 0
    score = [0, 0]
    possession = rng.randi_range(0, 1)
    zone = 50.0
    energy = [100.0, 100.0]
    ended = false
    log.clear()
    hand.clear()
    for i in 5:
        hand.append(_draw_card())
    _emit()

func play_card(index: int) -> Dictionary:
    if ended or index < 0 or index >= hand.size():
        return snapshot()
    var card := hand[index]
    var rival := ACTIONS[rng.randi_range(0, ACTIONS.size() - 1)]
    var user_roll := rng.randi_range(1, 6) + rng.randi_range(1, 6) + int(card.power)
    var rival_roll := rng.randi_range(1, 6) + rng.randi_range(1, 6) + int(rival.base)
    var success := user_roll >= rival_roll
    minute += rng.randi_range(2, 4)
    energy[0] = maxf(35.0, energy[0] - rng.randf_range(0.8, 2.4))
    energy[1] = maxf(35.0, energy[1] - rng.randf_range(0.8, 2.4))
    _resolve(card, rival, success)
    hand[index] = _draw_card()
    if minute >= 90:
        minute = 90
        ended = true
        log.push_front("Final del partido: %d-%d" % score)
        finished.emit(snapshot())
    _emit()
    return snapshot()

func _resolve(card: Dictionary, rival: Dictionary, success: bool) -> void:
    var attacking := possession == 0
    if success:
        if bool(card.attack) and attacking:
            zone = maxf(0.0, zone - rng.randf_range(9.0, 19.0))
            if card.id == &"tiro" or zone < 14.0:
                var chance := clampf(0.18 + (20.0 - zone) * 0.022 + float(card.power) * 0.018, 0.12, 0.72)
                if rng.randf() < chance:
                    score[0] += 1
                    zone = 50.0
                    possession = 1
                    log.push_front("%d' ¡Gol! %s resolvió la jugada." % [minute, card.name])
                    return
                log.push_front("%d' Ocasión local, pero no entra." % minute)
            else:
                log.push_front("%d' %s progresa con ventaja." % [minute, card.name])
        elif not bool(card.attack) and not attacking:
            possession = 0
            zone = minf(78.0, zone + rng.randf_range(7.0, 15.0))
            log.push_front("%d' Recuperación con %s." % [minute, card.name])
        else:
            possession = 1 - possession
            log.push_front("%d' Cambio de posesión." % minute)
    else:
        if possession == 1 and rng.randf() < 0.22 + maxf(0.0, zone - 50.0) * 0.004:
            score[1] += 1
            zone = 50.0
            possession = 0
            log.push_front("%d' Gol del rival al contraataque." % minute)
        else:
            possession = 1 - possession
            zone = clampf(zone + (10.0 if possession == 1 else -10.0), 8.0, 92.0)
            log.push_front("%d' El rival neutraliza %s con %s." % [minute, card.name, rival.name])

func _draw_card() -> Dictionary:
    var action: Dictionary = ACTIONS[rng.randi_range(0, ACTIONS.size() - 1)].duplicate()
    var rarity_roll := rng.randf()
    var rarity := "Común"
    var bonus := 0
    if rarity_roll > 0.96:
        rarity = "Leyenda"; bonus = 5
    elif rarity_roll > 0.84:
        rarity = "Épica"; bonus = 3
    elif rarity_roll > 0.58:
        rarity = "Rara"; bonus = 2
    else:
        bonus = 1
    action["rarity"] = rarity
    action["power"] = int(action.base) + bonus
    return action

func snapshot() -> Dictionary:
    return {"minute": minute, "score": score.duplicate(), "possession": possession, "zone": zone,
        "energy": energy.duplicate(), "hand": hand.duplicate(true), "log": log.slice(0, mini(6, log.size())), "ended": ended}

func _emit() -> void:
    changed.emit(snapshot())
