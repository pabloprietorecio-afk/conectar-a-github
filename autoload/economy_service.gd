extends Node
const GUARANTEE_EPIC:=10
const GUARANTEE_LEGENDARY:=30
var state:={"coins":2500,"tokens":0,"packs":0,"since_epic":0,"since_legendary":0,"market_refresh":0}
func open_pack(rng:RandomNumberGenerator)->Array:
 state.packs+=1;state.since_epic+=1;state.since_legendary+=1
 var cards:Array=[]
 for i in 5:cards.append(_roll_card(rng))
 if state.since_legendary>=GUARANTEE_LEGENDARY:_force(cards,"L",rng);state.since_legendary=0;state.since_epic=0
 elif state.since_epic>=GUARANTEE_EPIC:_force(cards,"E",rng);state.since_epic=0
 for c in cards:
  if c.rarity=="E":state.since_epic=0
  if c.rarity=="L":state.since_legendary=0;state.since_epic=0
 return cards
func _roll_card(rng:RandomNumberGenerator)->Dictionary:
 var x:=rng.randf();var r:="C" if x<.56 else "U" if x<.79 else "R" if x<.92 else "E" if x<.985 else "L"
 return {"rarity":r,"ovr":{"C":68,"U":74,"R":81,"E":89,"L":95}[r]+rng.randi_range(-2,2),"pos":["POR","DFC","LD","LI","MCD","MC","MCO","ED","EI","DC"][rng.randi_range(0,9)]}
func _force(cards:Array,rarity:String,rng:RandomNumberGenerator)->void:cards[rng.randi_range(0,cards.size()-1)]={"rarity":rarity,"ovr":90 if rarity=="E" else 96,"pos":["POR","DFC","MC","DC"][rng.randi_range(0,3)]}
func recycle(card:Dictionary,useful:bool)->Dictionary:
 if useful:return {"kept":true,"tokens":0}
 var gain:int=int({"C":1,"U":2,"R":5,"E":12,"L":30}.get(card.get("rarity","C"),1));state.tokens+=gain;return {"kept":false,"tokens":gain}
func craft(rarity:String)->bool:
 var cost:int=int({"C":2,"U":5,"R":12,"E":30,"L":75}.get(rarity,999))
 if state.tokens<cost:return false
 state.tokens-=cost;return true
