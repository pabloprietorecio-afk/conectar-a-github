extends Node
var offers:Array=[]
func refresh(seed_value:int,division:int)->Array:
 var rng:=RandomNumberGenerator.new();rng.seed=seed_value;offers=[]
 for i in 8:
  var ovr:=clampi(66+(6-division)*3+rng.randi_range(-4,9),60,96);var price:=int(pow(float(ovr-55),2.0)*5.0)
  offers.append({"id":"m_"+str(seed_value)+"_"+str(i),"name":"Jugador mercado "+str(i+1),"pos":["POR","DFC","LD","LI","MCD","MC","MCO","ED","EI","DC"][rng.randi_range(0,9)],"ovr":ovr,"price":price})
 return offers
func buy(index:int)->Dictionary:
 if index<0 or index>=offers.size():return {}
 var p:Dictionary=offers[index]
 if CareerService.data.coins<int(p.price):return {}
 CareerService.data.coins-=int(p.price);CareerService.data.squad.append(p);CareerService.save();return p
