extends Node
const FORMATIONS := {"4-3-3":["POR","LD","DFC","DFC","LI","MCD","MC","MCO","ED","DC","EI"],"4-4-2":["POR","LD","DFC","DFC","LI","MD","MC","MC","MI","DC","DC"],"4-2-3-1":["POR","LD","DFC","DFC","LI","MCD","MCD","ED","MCO","EI","DC"],"3-5-2":["POR","DFC","DFC","DFC","MD","MCD","MC","MCO","MI","DC","DC"]}
const FAMILY := {"POR":"GK","LD":"DEF","LI":"DEF","DFC":"DEF","MCD":"MID","MC":"MID","MCO":"MID","MD":"MID","MI":"MID","ED":"FWD","EI":"FWD","DC":"FWD"}
func penalty(natural:String,target:String)->float:
 if natural==target:return 1.0
 return .78 if FAMILY.get(natural)==FAMILY.get(target) else .48
func auto_lineup(squad:Array,formation:String)->Array:
 var slots:Array=FORMATIONS.get(formation,FORMATIONS["4-3-3"]);var used:Dictionary={};var lineup:Array=[]
 for target in slots:
  var best:Dictionary={};var score:=-999.0
  for player in squad:
   if used.has(player.get("id")):continue
   var s:=float(player.get("ovr",50))*penalty(str(player.get("pos","MC")),target)
   if s>score:score=s;best=player
  if not best.is_empty():used[best.id]=true;lineup.append({"slot":target,"player":best,"effective":round(score)})
 return lineup
