extends Node

var coins := 2500
var tokens := 0
var squad: Array[Dictionary] = []
var packs_opened := 0

func _ready() -> void:
    if squad.is_empty():
        squad = _starter_squad()

func _starter_squad() -> Array[Dictionary]:
    var roles := [&"POR", &"LD", &"DFC", &"DFC", &"LI", &"MCD", &"MC", &"MCO", &"ED", &"DC", &"EI", &"MC", &"DFC", &"DC"]
    var result: Array[Dictionary] = []
    for i in roles.size():
        result.append({"id": i + 1, "name": "Jugador %02d" % (i + 1), "pos": roles[i], "ovr": 68 + (i * 3) % 17, "energy": 100, "injured": false})
    return result

func open_pack() -> Array[Dictionary]:
    var rng := RandomNumberGenerator.new(); rng.randomize()
    var cards: Array[Dictionary] = []
    for i in 5:
        var roll := rng.randf()
        var rarity := "Común" if roll < .58 else "Rara" if roll < .84 else "Épica" if roll < .97 else "Leyenda"
        var value := 65 + rng.randi_range(0, 17) + ({"Común":0,"Rara":4,"Épica":8,"Leyenda":13}[rarity] as int)
        cards.append({"name":"Fichaje %03d" % rng.randi_range(1,999), "pos":["POR","DFC","LD","LI","MC","MCO","MCD","ED","EI","DC"][rng.randi_range(0,9)], "ovr":mini(99,value), "rarity":rarity})
    packs_opened += 1
    return cards

func best_eleven() -> Array[Dictionary]:
    var copy := squad.duplicate(true)
    copy.sort_custom(func(a,b): return a.ovr > b.ovr)
    return copy.slice(0, mini(11, copy.size()))
