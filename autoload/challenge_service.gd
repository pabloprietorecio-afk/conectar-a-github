extends Node
var counters:Dictionary={"matches":0,"wins":0,"goals":0,"packs":0,"subs":0,"clean_sheets":0,"shootout_wins":0,"seasons":0,"promotions":0}
var unlocked:Dictionary={}
var definitions:Array=[]
func _ready()->void:_build_definitions()
func register(event:String,amount:int=1)->Array:
 counters[event]=int(counters.get(event,0))+amount;var fresh:Array=[]
 for d in definitions:
  if not unlocked.has(d.id) and int(counters.get(d.counter,0))>=int(d.target):unlocked[d.id]=true;fresh.append(d)
 return fresh
func daily()->Array:return [{"id":"daily_play","label":"Juega un partido","value":counters.matches,"target":1},{"id":"daily_win","label":"Gana un partido","value":counters.wins,"target":1},{"id":"daily_goals","label":"Marca 3 goles","value":counters.goals,"target":3}]
func _build_definitions()->void:
 var specs=[{"counter":"matches","base":"Partidos","targets":[1,5,10,25,50,100,200,350,500,750,1000]},{"counter":"wins","base":"Victorias","targets":[1,5,10,25,50,100,200,350,500]},{"counter":"goals","base":"Goles","targets":[1,10,25,50,100,250,500,1000]},{"counter":"packs","base":"Sobres","targets":[1,5,10,25,50,100]},{"counter":"subs","base":"Cambios","targets":[1,10,25,50,100]},{"counter":"clean_sheets","base":"Porterías a cero","targets":[1,5,10,25,50]},{"counter":"shootout_wins","base":"Tandas ganadas","targets":[1,3,5,10,25]},{"counter":"seasons","base":"Temporadas","targets":[1,3,5,10,20]},{"counter":"promotions","base":"Ascensos","targets":[1,2,3,4,5]}]
 for s in specs:
  for t in s.targets:definitions.append({"id":s.counter+"_"+str(t),"label":s.base+" "+str(t),"counter":s.counter,"target":t})
